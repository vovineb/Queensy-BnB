// Pure pricing logic shared by the server (authoritative) and UI (preview).

export type PricingOffer = {
  id: string;
  title: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minNights: number;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
};

export type Quote = {
  nights: number;
  nightlyRate: number;
  subtotal: number;
  discountAmount: number;
  cleaningFee: number;
  total: number;
  offer: { id: string; title: string } | null;
};

/** An offer applies when it is active, the check-in date falls within its window and the stay is long enough. */
export function offerApplies(offer: PricingOffer, checkIn: Date, nights: number): boolean {
  return offer.active && checkIn >= startOfUtcDay(offer.startsAt) && checkIn < offer.endsAt && nights >= offer.minNights;
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function discountFor(offer: PricingOffer, subtotal: number): number {
  const raw = offer.discountType === "PERCENT" ? Math.round((subtotal * offer.discountValue) / 100) : offer.discountValue;
  return Math.max(0, Math.min(raw, subtotal));
}

export function computeQuote(input: {
  basePrice: number;
  cleaningFee: number;
  checkIn: Date;
  nights: number;
  offers: PricingOffer[];
}): Quote {
  const subtotal = input.basePrice * input.nights;
  let best: { offer: PricingOffer; amount: number } | null = null;
  for (const offer of input.offers) {
    if (!offerApplies(offer, input.checkIn, input.nights)) continue;
    const amount = discountFor(offer, subtotal);
    if (amount > 0 && (!best || amount > best.amount)) best = { offer, amount };
  }
  const discountAmount = best?.amount ?? 0;
  return {
    nights: input.nights,
    nightlyRate: input.basePrice,
    subtotal,
    discountAmount,
    cleaningFee: input.cleaningFee,
    total: subtotal - discountAmount + input.cleaningFee,
    offer: best ? { id: best.offer.id, title: best.offer.title } : null,
  };
}

export function describeDiscount(offer: Pick<PricingOffer, "discountType" | "discountValue">, formatFixed: (minor: number) => string) {
  return offer.discountType === "PERCENT" ? `${offer.discountValue}% off` : `${formatFixed(offer.discountValue)} off`;
}
