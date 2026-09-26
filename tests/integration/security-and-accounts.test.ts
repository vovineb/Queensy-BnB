import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { sha256 } from "@/server/crypto";
import { AppError } from "@/server/errors";
import { SESSION_COOKIE, getCurrentUser } from "@/server/auth/session";
import * as accounts from "@/server/services/accounts";
import { rateLimit } from "@/server/services/rate-limit";
import { setUserRoleAction, setUserStatusAction, saveSettingsAction } from "@/server/actions/admin/people";
import { transitionBookingAction } from "@/server/actions/admin/bookings";
import { setPropertyStatusAction, deletePropertyAction } from "@/server/actions/admin/properties";
import { createBooking } from "@/server/services/bookings";
import { cookieJar } from "../support/setup";
import { makeProperty, makeUser, resetDb, stay } from "../support/factories";

const signUpInput = (email: string) => ({ name: "Amina Wanjiru", email, phone: "+254712345678", password: "correct horse battery", marketingEmail: true, marketingSms: false, marketingWhatsapp: false });
const ctx = { ip: "198.51.100.1" };

async function signInAs(user: { id: string }) {
  const token = `test-token-${user.id}`;
  await db.session.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) } });
  cookieJar.set(SESSION_COOKIE, token);
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("accounts", () => {
  it("signs up with hashed password, session cookie and an auditable consent trail", async () => {
    const user = await accounts.signUp(signUpInput("amina@example.com"), ctx);
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(cookieJar.get(SESSION_COOKIE)).toBeTruthy();
    expect((await getCurrentUser())?.email).toBe("amina@example.com");
    const consents = await db.consentRecord.findMany({ where: { userId: user.id } });
    expect(consents.map((c) => `${c.type}:${c.granted}`).sort()).toEqual(["MARKETING_EMAIL:true", "MARKETING_SMS:false", "MARKETING_WHATSAPP:false", "PRIVACY_NOTICE:true", "TERMS:true"]);
    expect(await db.marketingPreference.findUnique({ where: { userId: user.id } })).toMatchObject({ email: true, sms: false });
  });

  it("rejects duplicate emails and uses one generic message for bad credentials", async () => {
    await accounts.signUp(signUpInput("dup@example.com"), ctx);
    await expect(accounts.signUp(signUpInput("dup@example.com"), ctx)).rejects.toMatchObject({ code: "CONFLICT" });
    const wrongPw = await accounts.signIn("dup@example.com", "wrong password!", ctx).catch((e: AppError) => e.message);
    const noUser = await accounts.signIn("nobody@example.com", "wrong password!", ctx).catch((e: AppError) => e.message);
    expect(wrongPw).toBe(noUser);
  });

  it("blocks deactivated accounts and drops their sessions", async () => {
    const u = await accounts.signUp(signUpInput("gone@example.com"), ctx);
    await db.user.update({ where: { id: u.id }, data: { status: "DEACTIVATED" } });
    expect(await getCurrentUser()).toBeNull();
    await expect(accounts.signIn("gone@example.com", "correct horse battery", ctx)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("password reset tokens are hashed, single-use, and invalidate other sessions", async () => {
    const u = await accounts.signUp(signUpInput("reset@example.com"), ctx);
    // Capture the raw token by issuing one directly the same way the service does.
    await accounts.requestPasswordReset("reset@example.com", ctx);
    const stored = await db.authToken.findFirstOrThrow({ where: { userId: u.id, purpose: "PASSWORD_RESET" } });
    expect(stored.tokenHash).toHaveLength(64); // sha256 hex, raw token never stored
    await db.authToken.update({ where: { id: stored.id }, data: { tokenHash: sha256("known-reset-token-value-123") } });
    await db.session.create({ data: { id: "other-device", userId: u.id, expiresAt: new Date(Date.now() + 86_400_000) } });
    await accounts.resetPassword("known-reset-token-value-123", "a brand new password");
    expect(await db.session.findUnique({ where: { id: "other-device" } })).toBeNull();
    await expect(accounts.resetPassword("known-reset-token-value-123", "another new password")).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(accounts.signIn("reset@example.com", "a brand new password", ctx)).resolves.toBeTruthy();
  });

  it("links legacy guest bookings only after the email is verified", async () => {
    const p = await makeProperty();
    const legacy = await db.booking.create({
      data: { reference: "QB-L-legacy1", legacyId: "legacy1", propertyId: p.id, checkIn: new Date("2025-01-01"), checkOut: new Date("2025-01-03"), nights: 2, currency: "KES", nightlyRate: 1, subtotal: 2, total: 2, guestName: "Old", guestEmail: "legacy@example.com", status: "EXPIRED" },
    });
    const u = await accounts.signUp(signUpInput("legacy@example.com"), ctx);
    expect((await db.booking.findUniqueOrThrow({ where: { id: legacy.id } })).userId).toBeNull();
    const t = await db.authToken.findFirstOrThrow({ where: { userId: u.id, purpose: "EMAIL_VERIFICATION" } });
    await db.authToken.update({ where: { id: t.id }, data: { tokenHash: sha256("verify-token-abcdefghijklmnop") } });
    expect(await accounts.verifyEmail("verify-token-abcdefghijklmnop")).toBe(true);
    expect((await db.booking.findUniqueOrThrow({ where: { id: legacy.id } })).userId).toBe(u.id);
  });

  it("records every marketing preference change", async () => {
    const u = await accounts.signUp(signUpInput("prefs@example.com"), ctx);
    await accounts.updateMarketingPreferences(u.id, { email: false, sms: true, whatsapp: false });
    const recent = await db.consentRecord.findMany({ where: { userId: u.id, source: "account_settings" } });
    expect(recent.map((c) => `${c.type}:${c.granted}`).sort()).toEqual(["MARKETING_EMAIL:false", "MARKETING_SMS:true"]);
  });
});

describe("server-side authorisation of admin operations", () => {
  it("rejects admin actions for anonymous users and customers", async () => {
    const customer = await makeUser();
    const target = await makeUser();
    const p = await makeProperty({ status: "DRAFT" });
    const b = await createBooking(customer, stay((await makeProperty()).id, 10, 12));

    for (const signedIn of [false, true]) {
      cookieJar.clear();
      if (signedIn) await signInAs(customer);
      const expected = signedIn ? "FORBIDDEN" : "UNAUTHENTICATED";
      expect(await setUserRoleAction(customer.id, "ADMIN")).toMatchObject({ ok: false, code: expected });
      expect(await setUserStatusAction(target.id, "DEACTIVATED")).toMatchObject({ ok: false, code: expected });
      expect(await transitionBookingAction(b.id, "CONFIRMED")).toMatchObject({ ok: false, code: expected });
      expect(await setPropertyStatusAction(p.id, "PUBLISHED")).toMatchObject({ ok: false, code: expected });
      expect(await deletePropertyAction(p.id)).toMatchObject({ ok: false, code: expected });
      const fd = new FormData();
      fd.set("siteName", "Hacked");
      expect(await saveSettingsAction({ ok: false, error: "" }, fd)).toMatchObject({ ok: false, code: expected });
    }
    expect((await db.user.findUniqueOrThrow({ where: { id: customer.id } })).role).toBe("CUSTOMER");
    expect((await db.property.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("DRAFT");
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("PENDING");
  });

  it("lets admins act, audits it, and prevents removing the last admin", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const target = await makeUser();
    await signInAs(admin);
    expect(await setUserRoleAction(target.id, "ADMIN")).toMatchObject({ ok: true });
    expect(await setUserRoleAction(admin.id, "CUSTOMER")).toMatchObject({ ok: false, code: "FORBIDDEN" }); // self
    expect(await db.auditLog.count({ where: { action: "user.role_change", entityId: target.id } })).toBe(1);
    // Promoted user's existing sessions are revoked so privileges are re-evaluated.
    expect(await db.session.count({ where: { userId: target.id } })).toBe(0);
  });

  it("lets only the site owner grant admin access when OWNER_EMAIL is set", async () => {
    process.env.OWNER_EMAIL = "Owner@Example.com";
    try {
      const owner = await makeUser({ role: "ADMIN", email: "owner@example.com" });
      const staff = await makeUser({ role: "ADMIN" });
      const target = await makeUser();
      await signInAs(staff);
      expect(await setUserRoleAction(target.id, "ADMIN")).toMatchObject({ ok: false, code: "FORBIDDEN" });
      expect(await setUserRoleAction(owner.id, "CUSTOMER")).toMatchObject({ ok: false, code: "FORBIDDEN" });
      expect(await setUserStatusAction(owner.id, "DEACTIVATED")).toMatchObject({ ok: false, code: "FORBIDDEN" });
      expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe("CUSTOMER");
      expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).status).toBe("ACTIVE");

      cookieJar.clear();
      await signInAs(owner);
      expect(await setUserRoleAction(target.id, "ADMIN")).toMatchObject({ ok: true });
      expect(await setUserRoleAction(staff.id, "CUSTOMER")).toMatchObject({ ok: true });
    } finally {
      delete process.env.OWNER_EMAIL;
    }
  });
});

describe("rate limiting", () => {
  it("blocks after the limit within the window", async () => {
    for (let i = 0; i < 3; i++) await rateLimit("test", "1.2.3.4", 3, 60);
    await expect(rateLimit("test", "1.2.3.4", 3, 60)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await expect(rateLimit("test", "5.6.7.8", 3, 60)).resolves.toBeUndefined();
    const keys = await db.rateLimit.findMany();
    expect(keys.every((k) => !k.key.includes("1.2.3.4"))).toBe(true); // identifiers are hashed
  });
});
