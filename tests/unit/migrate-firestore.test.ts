import { describe, expect, it } from "vitest";
import { transformLegacy } from "../../scripts/migrate-firestore-transform";

const ctx = () => ({
  properties: [{ id: "p-wendy", name: "Wendy's Penthouse", slug: "wendys-penthouse", legacyId: "legacy-3", currency: "KES" }],
  amenities: [{ id: "a-wifi", slug: "wifi", name: "Wi-Fi" }, { id: "a-pool", slug: "pool", name: "Swimming pool" }],
  destinationId: "d-diani",
  alreadyImported: { properties: new Set<string>(), bookings: new Set<string>(), reviews: new Set<string>(), inquiries: new Set<string>() },
  existingActive: [],
  now: new Date("2026-09-25T10:00:00Z"),
});

describe("Firestore migration transform", () => {
  it("maps bookings by property name, preserving amounts and ids", () => {
    const plan = transformLegacy(
      { Bookings: [{ id: "b1", name: "Jane", email: "JANE@x.com", property: "Wendy's Penthouse", checkIn: "2026-12-01", checkOut: "2026-12-04", totalAmount: 46500, createdAt: "2026-09-01T00:00:00Z" }] },
      ctx(),
    );
    expect(plan.bookings[0]).toMatchObject({ legacyId: "b1", propertyId: "p-wendy", nights: 3, total: 4650000, guestEmail: "jane@x.com", status: "PENDING" });
  });

  it("marks past stays expired and imports overlapping future stays as cancelled", () => {
    const plan = transformLegacy(
      {
        Bookings: [
          { id: "old", property: "Wendy's Penthouse", checkIn: "2025-07-01", checkOut: "2025-07-03", createdAt: "2025-06-01" },
          { id: "first", property: "Wendy's Penthouse", checkIn: "2026-12-01", checkOut: "2026-12-05", createdAt: "2026-09-01" },
          { id: "clash", property: "Wendy's Penthouse", checkIn: "2026-12-03", checkOut: "2026-12-06", createdAt: "2026-09-02" },
          { id: "adjacent", property: "Wendy's Penthouse", checkIn: "2026-12-06", checkOut: "2026-12-08", createdAt: "2026-09-03" },
        ],
      },
      ctx(),
    );
    const status = Object.fromEntries(plan.bookings.map((b) => [b.legacyId, b.status]));
    expect(status).toEqual({ old: "EXPIRED", first: "PENDING", clash: "CANCELLED", adjacent: "PENDING" });
    expect(plan.warnings.some((w) => w.includes("clash"))).toBe(true);
  });

  it("skips invalid data with warnings instead of failing", () => {
    const plan = transformLegacy({ Bookings: [{ id: "bad", property: "Nowhere", checkIn: "x", checkOut: "y" }, { id: "bad2", property: "Wendy's Penthouse", checkIn: "2026-12-05", checkOut: "2026-12-01" }] }, ctx());
    expect(plan.bookings).toHaveLength(0);
    expect(plan.warnings).toHaveLength(2);
  });

  it("imports reviews hidden, tickets as inquiries, and new properties as drafts", () => {
    const plan = transformLegacy(
      {
        Reviews: [{ id: "r1", name: "Sam Otieno", property: "Wendy's Penthouse", hostRating: "5", amenitiesRating: "4", cleanlinessRating: "5", neighborhoodRating: "4", recommendation: "Highly recommended!" }],
        Tickets: [{ id: "t1", name: "Guest", email: "unknown", issueType: "Booking", description: "Help", status: "In Progress" }],
        Properties: [{ id: "fp1", name: "Ocean Villa", price: 20000, beds: 4, amenities: ["WiFi", "Pool"], images: ["https://firebasestorage.googleapis.com/x.jpg", "http://insecure/x.jpg"] }],
      },
      ctx(),
    );
    expect(plan.reviews[0]).toMatchObject({ status: "HIDDEN", rating: 4.5, authorName: "Sam" });
    expect(plan.inquiries[0]).toMatchObject({ email: null, status: "IN_PROGRESS", topic: "Booking" });
    expect(plan.properties[0]).toMatchObject({ status: "DRAFT", slug: "ocean-villa", basePrice: 2000000, amenityIds: ["a-wifi", "a-pool"] });
    expect(plan.properties[0].images).toHaveLength(1);
  });
});
