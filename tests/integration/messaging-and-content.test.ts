import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import * as messaging from "@/server/services/messaging";
import { submitReview } from "@/server/services/reviews";
import { toggleFavorite } from "@/server/services/favorites";
import { submitInquiry, subscribeNewsletter } from "@/server/services/leads";
import { searchProperties } from "@/server/services/catalog";
import { createBooking, transitionBooking } from "@/server/services/bookings";
import { searchParamsSchema } from "@/lib/validation";
import { parseIsoDate } from "@/lib/dates";
import { inDays, makeProperty, makeUser, resetDb, stay } from "../support/factories";

beforeEach(resetDb);

describe("messaging", () => {
  it("keeps conversations private, tracks unread state per side", async () => {
    const [alice, bob] = await Promise.all([makeUser(), makeUser()]);
    const admin = await makeUser({ role: "ADMIN" });
    const convo = await messaging.startConversation(alice, { subject: "Parking?", body: "Is there parking?" });
    await expect(messaging.getConversation(bob, convo.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(messaging.sendMessage(bob, convo.id, "hi")).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await messaging.unreadCountForStaff()).toBe(1);
    await messaging.markConversationRead(admin, convo.id);
    expect(await messaging.unreadCountForStaff()).toBe(0);

    await messaging.sendMessage(admin, convo.id, "Yes, free parking.");
    expect(await messaging.unreadCountForCustomer(alice.id)).toBe(1);
    expect(await db.notification.count({ where: { userId: alice.id, type: "message.new" } })).toBe(1);
    await messaging.markConversationRead(alice, convo.id);
    expect(await messaging.unreadCountForCustomer(alice.id)).toBe(0);

    const thread = await messaging.getConversation(alice, convo.id);
    expect(thread.messages.map((m) => m.fromStaff)).toEqual([false, true]);
  });

  it("reuses the open thread for a booking and blocks threads on other people's bookings", async () => {
    const [alice, bob] = await Promise.all([makeUser(), makeUser()]);
    const b = await createBooking(alice, stay((await makeProperty()).id, 5, 7));
    const c1 = await messaging.startConversation(alice, { subject: "Arrival", body: "Arriving late", bookingId: b.id });
    const c2 = await messaging.startConversation(alice, { subject: "Arrival 2", body: "Also a cot?", bookingId: b.id });
    expect(c2.id).toBe(c1.id);
    await expect(messaging.startConversation(bob, { subject: "x", body: "y", bookingId: b.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("reviews", () => {
  it("only allows one review per completed stay by its guest, and updates the property rating", async () => {
    const [guest, other] = await Promise.all([makeUser(), makeUser()]);
    const p = await makeProperty();
    const future = await createBooking(guest, stay(p.id, 5, 7));
    const input = (bookingId: string) => ({ bookingId, hostRating: 5, amenitiesRating: 4, cleanlinessRating: 5, neighborhoodRating: 4, comment: "Lovely" });
    await expect(submitReview(guest, input(future.id))).rejects.toMatchObject({ code: "FORBIDDEN" });

    const past = await db.booking.create({
      data: { reference: "QB-DONE0001", propertyId: p.id, userId: guest.id, checkIn: parseIsoDate(inDays(-6)), checkOut: parseIsoDate(inDays(-3)), nights: 3, currency: "KES", nightlyRate: 1, subtotal: 3, total: 3, guestName: "G", guestEmail: guest.email, status: "COMPLETED" },
    });
    await expect(submitReview(other, input(past.id))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await submitReview(guest, input(past.id));
    await expect(submitReview(guest, input(past.id))).rejects.toMatchObject({ code: "CONFLICT" });
    const updated = await db.property.findUniqueOrThrow({ where: { id: p.id } });
    expect(Number(updated.ratingAverage)).toBe(4.5);
    expect(updated.reviewCount).toBe(1);
  });
});

describe("catalogue & favourites", () => {
  it("search hides drafts and properties booked for the requested dates", async () => {
    const guest = await makeUser();
    const free = await makeProperty();
    const booked = await makeProperty();
    await makeProperty({ status: "DRAFT" });
    await createBooking(guest, stay(booked.id, 30, 33));
    const all = await searchProperties(searchParamsSchema.parse({}));
    expect(all.total).toBe(2);
    const dated = await searchProperties(searchParamsSchema.parse({ checkIn: inDays(31), checkOut: inDays(32) }));
    expect(dated.results.map((r) => r.id)).toEqual([free.id]);
    // Cancelled bookings free the property again.
    const b = await db.booking.findFirstOrThrow({ where: { propertyId: booked.id } });
    await transitionBooking(guest, b.id, "CANCELLED");
    expect((await searchProperties(searchParamsSchema.parse({ checkIn: inDays(31), checkOut: inDays(32) }))).total).toBe(2);
  });

  it("can't favourite unpublished properties", async () => {
    const u = await makeUser();
    const draft = await makeProperty({ status: "DRAFT" });
    await expect(toggleFavorite(u.id, draft.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const live = await makeProperty();
    expect(await toggleFavorite(u.id, live.id)).toBe(true);
    expect(await toggleFavorite(u.id, live.id)).toBe(false);
  });
});

describe("leads & consent", () => {
  it("inquiries create prospects without assuming marketing consent", async () => {
    await submitInquiry({ name: "Kofi", email: "kofi@example.com", topic: "Long stay", message: "3 months?", marketingEmail: false }, { ip: "192.0.2.10" });
    const prospect = await db.prospect.findUniqueOrThrow({ where: { email: "kofi@example.com" } });
    expect(prospect).toMatchObject({ source: "INQUIRY", marketingConsent: false });
    // A later inquiry without opt-in never flips consent on; newsletter opt-in does, with a record.
    await submitInquiry({ name: "Kofi", email: "kofi@example.com", topic: "Other", message: "again", marketingEmail: false }, { ip: "192.0.2.10" });
    expect((await db.prospect.findUniqueOrThrow({ where: { email: "kofi@example.com" } })).marketingConsent).toBe(false);
    await subscribeNewsletter("kofi@example.com", { ip: "192.0.2.10" });
    expect((await db.prospect.findUniqueOrThrow({ where: { email: "kofi@example.com" } })).marketingConsent).toBe(true);
    expect(await db.consentRecord.count({ where: { email: "kofi@example.com", type: "MARKETING_EMAIL", granted: true } })).toBe(1);
  });
});
