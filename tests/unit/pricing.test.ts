import { describe, expect, it } from "vitest";
import { computeQuote, discountFor, offerApplies, type PricingOffer } from "@/lib/pricing";
import { parseIsoDate } from "@/lib/dates";

const offer = (o: Partial<PricingOffer>): PricingOffer => ({
  id: "o1", title: "Offer", discountType: "PERCENT", discountValue: 10, minNights: 1,
  startsAt: parseIsoDate("2026-10-01"), endsAt: parseIsoDate("2026-11-01"), active: true, ...o,
});

describe("pricing", () => {
  it("computes a simple quote in minor units", () => {
    const q = computeQuote({ basePrice: 550000, cleaningFee: 100000, checkIn: parseIsoDate("2026-10-05"), nights: 3, offers: [] });
    expect(q).toMatchObject({ subtotal: 1650000, discountAmount: 0, cleaningFee: 100000, total: 1750000, offer: null });
  });

  it("applies an offer only when check-in is inside the window and min nights are met", () => {
    const o = offer({ minNights: 3 });
    expect(offerApplies(o, parseIsoDate("2026-10-10"), 3)).toBe(true);
    expect(offerApplies(o, parseIsoDate("2026-10-10"), 2)).toBe(false);
    expect(offerApplies(o, parseIsoDate("2026-11-01"), 5)).toBe(false); // end is exclusive
    expect(offerApplies(o, parseIsoDate("2026-09-30"), 5)).toBe(false);
    expect(offerApplies({ ...o, active: false }, parseIsoDate("2026-10-10"), 5)).toBe(false);
  });

  it("picks the best discount and never discounts below zero", () => {
    const q = computeQuote({
      basePrice: 100000, cleaningFee: 0, checkIn: parseIsoDate("2026-10-10"), nights: 2,
      offers: [offer({ id: "a", discountValue: 10 }), offer({ id: "b", discountType: "FIXED", discountValue: 50000 }), offer({ id: "c", discountType: "FIXED", discountValue: 999999 })],
    });
    expect(q.offer?.id).toBe("c");
    expect(q.discountAmount).toBe(200000);
    expect(q.total).toBe(0);
  });

  it("rounds percentage discounts to whole minor units", () => {
    expect(discountFor(offer({ discountValue: 15 }), 333333)).toBe(50000);
  });
});
