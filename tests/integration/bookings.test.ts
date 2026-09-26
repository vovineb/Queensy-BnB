import { beforeEach, describe, expect, it } from "vitest";
import { db, EXCLUSION_VIOLATION, pgErrorCode } from "@/server/db";
import { createBooking, recordManualPayment, transitionBooking, quoteStay } from "@/server/services/bookings";
import { runBookingMaintenance } from "@/server/services/availability";
import { parseIsoDate } from "@/lib/dates";
import { AppError } from "@/server/errors";
import { inDays, makeProperty, makeUser, resetDb, stay } from "../support/factories";

const code = (p: Promise<unknown>) => p.then(() => "OK", (e: unknown) => (e instanceof AppError ? e.code : `UNEXPECTED: ${String(e)}`));

beforeEach(resetDb);

describe("booking creation", () => {
  it("creates a pending booking with a server-computed price snapshot and a hold", async () => {
    const guest = await makeUser();
    const p = await makeProperty({ basePrice: 550000, cleaningFee: 150000 });
    const b = await createBooking(guest, stay(p.id, 10, 13));
    expect(b).toMatchObject({ status: "PENDING", nights: 3, subtotal: 1650000, cleaningFee: 150000, total: 1800000, currency: "KES", userId: guest.id });
    expect(b.reference).toMatch(/^QB-[2-9A-HJ-NP-Z]{8}$/);
    const holdHours = (b.expiresAt!.getTime() - Date.now()) / 3_600_000;
    expect(holdHours).toBeGreaterThan(11.9);
    expect(holdHours).toBeLessThanOrEqual(12);
    const events = await db.bookingStatusEvent.findMany({ where: { bookingId: b.id } });
    expect(events.map((e) => e.toStatus)).toEqual(["PENDING"]);
    // Guest and admin both get in-app notifications.
    expect(await db.notification.count({ where: { userId: guest.id, type: "booking.created" } })).toBe(1);
  });

  it("allows exactly one of many concurrent requests for the same dates", async () => {
    const p = await makeProperty();
    const guests = await Promise.all(Array.from({ length: 10 }, () => makeUser()));
    const results = await Promise.all(guests.map((g) => code(createBooking(g, stay(p.id, 20, 23)))));
    expect(results.filter((r) => r === "OK")).toHaveLength(1);
    expect(results.filter((r) => r === "DATES_UNAVAILABLE")).toHaveLength(9);
    expect(await db.booking.count({ where: { propertyId: p.id } })).toBe(1);
  });

  it("rejects overlapping stays but allows back-to-back check-out/check-in", async () => {
    const [a, b, c] = await Promise.all([makeUser(), makeUser(), makeUser()]);
    const p = await makeProperty();
    await createBooking(a, stay(p.id, 30, 33));
    expect(await code(createBooking(b, stay(p.id, 32, 34)))).toBe("DATES_UNAVAILABLE");
    expect(await code(createBooking(b, stay(p.id, 28, 31)))).toBe("DATES_UNAVAILABLE");
    expect(await code(createBooking(c, stay(p.id, 33, 35)))).toBe("OK");
    expect(await code(createBooking(c, stay(p.id, 27, 30)))).toBe("OK");
  });

  it("is enforced by the database even if application checks are bypassed", async () => {
    const guest = await makeUser();
    const p = await makeProperty();
    const row = (ref: string, from: number, to: number) => ({
      reference: ref, propertyId: p.id, userId: guest.id, checkIn: parseIsoDate(inDays(from)), checkOut: parseIsoDate(inDays(to)), nights: to - from,
      currency: "KES", nightlyRate: 1, subtotal: 1, total: 1, guestName: "x", guestEmail: "x@x.com", status: "CONFIRMED" as const,
    });
    await db.booking.create({ data: row("QB-RAW00001", 40, 45) });
    const err = await db.booking.create({ data: row("QB-RAW00002", 44, 46) }).catch((e) => e);
    expect(pgErrorCode(err)).toBe(EXCLUSION_VIOLATION);
    // Cancelled bookings don't occupy dates.
    await db.booking.create({ data: { ...row("QB-RAW00003", 44, 46), status: "CANCELLED" } });
  });

  it("rejects admin-blocked dates", async () => {
    const guest = await makeUser();
    const p = await makeProperty();
    await db.availabilityBlock.create({ data: { propertyId: p.id, startDate: parseIsoDate(inDays(50)), endDate: parseIsoDate(inDays(52)) } });
    expect(await code(createBooking(guest, stay(p.id, 51, 53)))).toBe("DATES_UNAVAILABLE");
    expect(await code(createBooking(guest, stay(p.id, 52, 54)))).toBe("OK");
  });

  it("validates stay rules on the server", async () => {
    const guest = await makeUser();
    const p = await makeProperty({ maxGuests: 2, minNights: 2 });
    expect(await code(createBooking(guest, stay(p.id, -2, 1)))).toBe("VALIDATION"); // past
    expect(await code(createBooking(guest, stay(p.id, 60, 61)))).toBe("VALIDATION"); // min nights
    expect(await code(createBooking(guest, stay(p.id, 60, 63, { adults: 3 })))).toBe("VALIDATION"); // capacity
    expect(await code(createBooking(guest, stay(p.id, 2000, 2003)))).toBe("VALIDATION"); // beyond horizon
    const draft = await makeProperty({ status: "DRAFT" });
    expect(await code(createBooking(guest, stay(draft.id, 60, 63)))).toBe("NOT_FOUND");
  });

  it("detects a price change between quote and submit", async () => {
    const guest = await makeUser();
    const p = await makeProperty({ basePrice: 100000 });
    expect(await code(createBooking(guest, stay(p.id, 70, 72, { expectedTotal: 150000 })))).toBe("PRICE_CHANGED");
    expect(await code(createBooking(guest, stay(p.id, 70, 72, { expectedTotal: 200000 })))).toBe("OK");
  });

  it("applies active offers automatically and records them on the booking", async () => {
    const guest = await makeUser();
    const p = await makeProperty({ basePrice: 100000 });
    const offer = await db.offer.create({ data: { title: "Long stay", discountType: "PERCENT", discountValue: 20, minNights: 3, startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() + 200 * 86_400_000) } });
    const q = await quoteStay(p.id, { checkIn: inDays(80), checkOut: inDays(84), adults: 1, children: 0, infants: 0 });
    expect(q.quote).toMatchObject({ subtotal: 400000, discountAmount: 80000, total: 320000 });
    const b = await createBooking(guest, stay(p.id, 80, 84, { expectedTotal: 320000 }));
    expect(b.offerId).toBe(offer.id);
    // Too short for the offer.
    const q2 = await quoteStay(p.id, { checkIn: inDays(90), checkOut: inDays(92), adults: 1, children: 0, infants: 0 });
    expect(q2.quote.discountAmount).toBe(0);
  });

  it("releases dates when a hold expires", async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const p = await makeProperty();
    const first = await createBooking(a, stay(p.id, 100, 103));
    await db.booking.update({ where: { id: first.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await code(createBooking(b, stay(p.id, 100, 103)))).toBe("OK");
    const expired = await db.booking.findUniqueOrThrow({ where: { id: first.id }, include: { events: true } });
    expect(expired.status).toBe("EXPIRED");
    expect(expired.events.map((e) => e.toStatus)).toContain("EXPIRED");
  });

  it("marks finished confirmed stays as completed during maintenance", async () => {
    const guest = await makeUser();
    const p = await makeProperty();
    const b = await db.booking.create({
      data: { reference: "QB-PAST0001", propertyId: p.id, userId: guest.id, checkIn: parseIsoDate(inDays(-5)), checkOut: parseIsoDate(inDays(-2)), nights: 3, currency: "KES", nightlyRate: 1, subtotal: 3, total: 3, guestName: "x", guestEmail: "x@x.com", status: "CONFIRMED" },
    });
    const r = await runBookingMaintenance();
    expect(r.completed).toBe(1);
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("COMPLETED");
  });
});

describe("booking status transitions & authorisation", () => {
  it("only lets admins confirm, and customers only cancel their own future bookings", async () => {
    const [owner, other] = await Promise.all([makeUser(), makeUser()]);
    const admin = await makeUser({ role: "ADMIN" });
    const p = await makeProperty();
    const b = await createBooking(owner, stay(p.id, 10, 12));
    expect(await code(transitionBooking(owner, b.id, "CONFIRMED"))).toBe("FORBIDDEN");
    expect(await code(transitionBooking(other, b.id, "CANCELLED"))).toBe("NOT_FOUND");
    expect(await code(transitionBooking(admin, b.id, "AWAITING_PAYMENT"))).toBe("OK");
    expect(await code(transitionBooking(admin, b.id, "PENDING" as never))).toBe("INVALID_TRANSITION");
    expect(await code(transitionBooking(owner, b.id, "CANCELLED"))).toBe("OK");
    expect(await code(transitionBooking(owner, b.id, "CANCELLED"))).toBe("FORBIDDEN");
    const final = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(final.status).toBe("CANCELLED");
    // Guest is notified of admin actions; admins are notified of guest cancellation.
    expect(await db.notification.count({ where: { userId: owner.id, type: "booking.updated" } })).toBe(1);
    expect(await db.notification.count({ where: { userId: admin.id, type: "booking.cancelled" } })).toBe(1);
    expect(await db.auditLog.count({ where: { entityId: b.id } })).toBeGreaterThanOrEqual(3);
  });

  it("frees dates when a booking is cancelled", async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const p = await makeProperty();
    const first = await createBooking(a, stay(p.id, 15, 18));
    await transitionBooking(a, first.id, "CANCELLED", { reason: "Change of plans" });
    expect(await code(createBooking(b, stay(p.id, 15, 18)))).toBe("OK");
  });

  it("records manual payments and marks fully paid bookings as PAID", async () => {
    const guest = await makeUser();
    const admin = await makeUser({ role: "ADMIN" });
    const p = await makeProperty({ basePrice: 100000 });
    const b = await createBooking(guest, stay(p.id, 25, 27));
    await recordManualPayment(admin, b.id, { amount: 50000, method: "mpesa", reference: "QK12AB34", markConfirmed: true });
    expect((await db.booking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("CONFIRMED");
    await recordManualPayment(admin, b.id, { amount: 150000, method: "mpesa", reference: "QK12AB35", markConfirmed: false });
    const paid = await db.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(paid.status).toBe("PAID");
    expect(paid.expiresAt).toBeNull();
    expect(await code(recordManualPayment(admin, b.id, { amount: 1, method: "mpesa", reference: "QK12AB35", markConfirmed: false }))).toBe("CONFLICT");
  });
});
