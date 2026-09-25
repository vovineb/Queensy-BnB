import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { randomToken, sha256 } from "@/server/crypto";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroyAllSessions } from "@/server/auth/session";
import type { AuthTokenPurpose, ConsentType } from "@/generated/prisma/client";
import { renderEmail, sendEmail } from "./mailer";
import { rateLimit } from "./rate-limit";
import { audit } from "./audit";
import { track } from "./analytics";

/** Bump when the privacy notice / terms materially change; stored with each consent record. */
export const POLICY_VERSION = "2026-09";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type SignUpInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  marketingEmail: boolean;
  marketingSms: boolean;
  marketingWhatsapp: boolean;
};

export async function signUp(input: SignUpInput, ctx: { ip: string; visitorId?: string }) {
  await rateLimit("signup", ctx.ip, 10, 3600);
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true, passwordHash: true } });
  if (existing?.passwordHash) {
    throw new AppError("CONFLICT", "An account with this email already exists. Try signing in or resetting your password.", {
      email: ["An account with this email already exists"],
    });
  }
  const passwordHash = await hashPassword(input.password);
  const consents: { type: ConsentType; granted: boolean }[] = [
    { type: "PRIVACY_NOTICE", granted: true },
    { type: "TERMS", granted: true },
    { type: "MARKETING_EMAIL", granted: input.marketingEmail },
    { type: "MARKETING_SMS", granted: input.marketingSms },
    { type: "MARKETING_WHATSAPP", granted: input.marketingWhatsapp },
  ];

  const user = await db.$transaction(async (tx) => {
    // Legacy/imported accounts exist without a password; claiming them requires
    // proving ownership via email reset, so we don't silently take them over.
    if (existing) {
      throw new AppError("CONFLICT", "We already have bookings under this email. Use “Forgot password” to set a password and access them.", {
        email: ["Use “Forgot password” to activate this email"],
      });
    }
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        marketingPreference: { create: { email: input.marketingEmail, sms: input.marketingSms, whatsapp: input.marketingWhatsapp } },
      },
    });
    await tx.consentRecord.createMany({
      data: consents.map((c) => ({ ...c, userId: created.id, source: "signup", policyVersion: POLICY_VERSION })),
    });
    // Earlier guest bookings are linked only after the email is verified
    // (see linkLegacyBookings), so nobody can claim someone else's stays.
    await tx.prospect.updateMany({ where: { email: input.email, userId: null }, data: { userId: created.id, ...(input.marketingEmail ? { marketingConsent: true } : {}) } });
    return created;
  });

  await createSession(user.id);
  await sendVerificationEmail(user.id, user.email, user.name).catch(() => undefined);
  if (ctx.visitorId) await track({ name: "signup", visitorId: ctx.visitorId, userId: user.id });
  return user;
}

export async function signIn(email: string, password: string, ctx: { ip: string; visitorId?: string }) {
  await rateLimit("login-ip", ctx.ip, 30, 900);
  await rateLimit("login-email", email, 10, 900);
  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(user?.passwordHash, password);
  // Same message for unknown email and wrong password (no account enumeration).
  if (!user || !valid) throw new AppError("UNAUTHENTICATED", "That email and password don't match. Please try again.");
  if (user.status !== "ACTIVE") throw new AppError("FORBIDDEN", "This account has been deactivated. Please contact us for help.");
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  if (ctx.visitorId) await track({ name: "login", visitorId: ctx.visitorId, userId: user.id });
  return user;
}

async function issueToken(userId: string, purpose: AuthTokenPurpose, ttlMs: number) {
  const token = randomToken();
  await db.authToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } });
  await db.authToken.create({ data: { tokenHash: sha256(token), userId, purpose, expiresAt: new Date(Date.now() + ttlMs) } });
  return token;
}

async function consumeToken(token: string, purpose: AuthTokenPurpose) {
  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) return null;
  const { count } = await db.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  return count === 1 ? record : null;
}

/** Always resolves successfully so responses don't reveal whether an email is registered. */
export async function requestPasswordReset(email: string, ctx: { ip: string }) {
  await rateLimit("reset-ip", ctx.ip, 10, 3600);
  await rateLimit("reset-email", email, 3, 3600);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;
  const token = await issueToken(user.id, "PASSWORD_RESET", 60 * 60 * 1000);
  const url = `${siteUrl()}/reset-password/${token}`;
  const { text, html } = renderEmail({
    heading: "Reset your password",
    paragraphs: [
      `Hi ${user.name.split(" ")[0]},`,
      "We received a request to reset your Queensy BnB password. This link works once and expires in 1 hour.",
      "If you didn't ask for this, you can ignore this email — your password won't change.",
    ],
    cta: { label: "Choose a new password", url },
  });
  await sendEmail({ to: user.email, subject: "Reset your Queensy BnB password", text, html });
}

export async function isResetTokenValid(token: string) {
  const record = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  return Boolean(record && record.purpose === "PASSWORD_RESET" && !record.usedAt && record.expiresAt > new Date());
}

export async function resetPassword(token: string, password: string) {
  const record = await consumeToken(token, "PASSWORD_RESET");
  if (!record) throw new AppError("VALIDATION", "This reset link is invalid or has expired. Please request a new one.");
  const passwordHash = await hashPassword(password);
  // Completing a reset proves control of the inbox, so the email is verified too.
  const user = await db.user.update({
    where: { id: record.userId },
    data: { passwordHash, emailVerifiedAt: new Date() },
  });
  await destroyAllSessions(user.id);
  await linkLegacyBookings(user.id, user.email);
  await audit({ actorId: user.id, action: "user.password_reset", entityType: "user", entityId: user.id });
  await createSession(user.id);
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError("VALIDATION", "Your current password is incorrect.", { currentPassword: ["Incorrect password"] });
  }
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
  await destroyAllSessions(userId, true);
  await audit({ actorId: userId, action: "user.password_change", entityType: "user", entityId: userId });
}

export async function sendVerificationEmail(userId: string, email: string, name: string) {
  const token = await issueToken(userId, "EMAIL_VERIFICATION", 7 * 24 * 60 * 60 * 1000);
  const { text, html } = renderEmail({
    heading: "Confirm your email",
    paragraphs: [`Welcome to Queensy BnB, ${name.split(" ")[0]}!`, "Please confirm your email address so we can send booking confirmations and updates."],
    cta: { label: "Confirm email", url: `${siteUrl()}/verify-email/${token}` },
  });
  await sendEmail({ to: email, subject: "Confirm your email for Queensy BnB", text, html });
}

export async function verifyEmail(token: string) {
  const record = await consumeToken(token, "EMAIL_VERIFICATION");
  if (!record) return false;
  const user = await db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  await linkLegacyBookings(user.id, user.email);
  return true;
}

/** Attaches bookings made before accounts existed (imported legacy data) to a verified email owner. */
export async function linkLegacyBookings(userId: string, email: string) {
  await db.booking.updateMany({ where: { guestEmail: { equals: email, mode: "insensitive" }, userId: null }, data: { userId } });
}

export async function updateProfile(userId: string, input: { name: string; phone: string }) {
  await db.user.update({ where: { id: userId }, data: { name: input.name, phone: input.phone } });
}

export async function updateMarketingPreferences(
  userId: string,
  prefs: { email: boolean; sms: boolean; whatsapp: boolean },
  source = "account_settings",
) {
  const current = await db.marketingPreference.findUnique({ where: { userId } });
  const changes: { type: ConsentType; granted: boolean }[] = [];
  if (current?.email !== prefs.email) changes.push({ type: "MARKETING_EMAIL", granted: prefs.email });
  if (current?.sms !== prefs.sms) changes.push({ type: "MARKETING_SMS", granted: prefs.sms });
  if (current?.whatsapp !== prefs.whatsapp) changes.push({ type: "MARKETING_WHATSAPP", granted: prefs.whatsapp });
  await db.$transaction([
    db.marketingPreference.upsert({ where: { userId }, create: { userId, ...prefs }, update: prefs }),
    db.consentRecord.createMany({ data: changes.map((c) => ({ ...c, userId, source, policyVersion: POLICY_VERSION })) }),
    db.prospect.updateMany({ where: { userId }, data: { marketingConsent: prefs.email || prefs.sms || prefs.whatsapp } }),
  ]);
}

/** Data subject access: everything we hold about the user, as JSON. */
export async function exportUserData(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, phone: true, role: true, createdAt: true, lastLoginAt: true, emailVerifiedAt: true,
      marketingPreference: { select: { email: true, sms: true, whatsapp: true, updatedAt: true } },
      consents: { select: { type: true, granted: true, source: true, policyVersion: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      bookings: { select: { reference: true, status: true, checkIn: true, checkOut: true, total: true, currency: true, guestPhone: true, specialRequests: true, createdAt: true, property: { select: { name: true } } } },
      reviews: { select: { rating: true, comment: true, createdAt: true, property: { select: { name: true } } } },
      favorites: { select: { createdAt: true, property: { select: { name: true } } } },
      conversations: { select: { subject: true, createdAt: true, messages: { select: { body: true, fromStaff: true, createdAt: true }, orderBy: { createdAt: "asc" } } } },
    },
  });
  return { exportedAt: new Date().toISOString(), policyVersion: POLICY_VERSION, ...user };
}
