import "server-only";
import { db, EXCLUSION_VIOLATION, pgErrorCode, type Tx } from "@/server/db";
import { AppError } from "@/server/errors";
import { bookingReference } from "@/server/crypto";
import { publish } from "@/server/realtime";
import { addDays, nightsBetween, parseIsoDate, toIsoDate } from "@/lib/dates";
import { computeQuote, type PricingOffer, type Quote } from "@/lib/pricing";
import { formatDateRange, formatMoney } from "@/lib/format";
import type { BookingStatus } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/auth/session";
import { getUnavailableRanges, runBookingMaintenance, today } from "./availability";
import { getSettings } from "./settings";
import { notifyAdmins, notifyUser } from "./notifications";
import { audit } from "./audit";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["AWAITING_PAYMENT", "CONFIRMED", "PAID", "CANCELLED", "EXPIRED"],
  AWAITING_PAYMENT: ["PAID", "CONFIRMED", "CANCELLED", "EXPIRED"],
  PAID: ["CONFIRMED", "CANCELLED", "REFUNDED", "COMPLETED"],
  CONFIRMED: ["PAID", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["REFUNDED"],
  EXPIRED: [],
  REFUNDED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus) {
  return BOOKING_TRANSITIONS[from].includes(to);
}

/** Statuses a customer may cancel from themselves (before check-in). */
const CUSTOMER_CANCELLABLE: BookingStatus[] = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "PAID"];

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export async function activeOffersFor(propertyId: string, client: Tx | typeof db = db): Promise<PricingOffer[]> {
  const now = new Date();
  return client.offer.findMany({
    where: {
      active: true,
      endsAt: { gt: now },
      OR: [{ appliesToAll: true }, { properties: { some: { propertyId } } }],
    },
    select: { id: true, title: true, discountType: true, discountValue: true, minNights: true, startsAt: true, endsAt: true, active: true },
  });
}

export type StayRequest = { checkIn: string; checkOut: string; adults: number; children: number; infants: number };

type PropertyForBooking = {
  id: string;
  name: string;
  status: string;
  maxGuests: number;
  minNights: number;
  maxNights: number | null;
  basePrice: number;
  cleaningFee: number;
  currency: string;
};

/** Validates stay rules (dates, horizon, nights, guests). Throws AppError with field errors. */
export async function validateStay(property: PropertyForBooking, stay: StayRequest, settings?: { bookingHorizonDays: number }) {
  // Callers inside a transaction must pass settings: querying through the global
  // client while holding a pooled transaction connection can exhaust the pool.
  settings ??= await getSettings();
  const checkIn = parseIsoDate(stay.checkIn);
  const checkOut = parseIsoDate(stay.checkOut);
  const nights = nightsBetween(checkIn, checkOut);
  const errors: Record<string, string[]> = {};
  if (property.status !== "PUBLISHED") throw new AppError("NOT_FOUND", "This property is not available for booking.");
  if (checkIn < today()) errors.checkIn = ["Check-in can't be in the past"];
  if (checkIn > addDays(today(), settings.bookingHorizonDays)) errors.checkIn = ["That date is too far ahead to book yet"];
  if (nights < 1) errors.checkOut = ["Check-out must be after check-in"];
  else if (nights < property.minNights) errors.checkOut = [`This stay needs at least ${property.minNights} nights`];
  else if (property.maxNights && nights > property.maxNights) errors.checkOut = [`Stays are limited to ${property.maxNights} nights`];
  const guests = stay.adults + stay.children;
  if (stay.adults < 1) errors.adults = ["At least one adult is required"];
  if (guests > property.maxGuests) errors.adults = [`This place fits up to ${property.maxGuests} guests`];
  if (Object.keys(errors).length > 0) {
    throw new AppError("VALIDATION", Object.values(errors)[0][0], errors);
  }
  return { checkIn, checkOut, nights };
}

export type QuoteResult = {
  available: boolean;
  quote: Quote;
  currency: string;
  nights: number;
};

/** Server-authoritative quote + availability for a stay. */
export async function quoteStay(propertyId: string, stay: StayRequest): Promise<QuoteResult> {
  const property = await db.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new AppError("NOT_FOUND", "Property not found.");
  const { checkIn, checkOut, nights } = await validateStay(property, stay);
  await runBookingMaintenance({ propertyId });
  const [ranges, offers] = await Promise.all([getUnavailableRanges(propertyId, checkIn, checkOut), activeOffersFor(propertyId)]);
  const quote = computeQuote({ basePrice: property.basePrice, cleaningFee: property.cleaningFee, checkIn, nights, offers });
  return { available: ranges.length === 0, quote, currency: property.currency, nights };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type CreateBookingInput = StayRequest & {
  propertyId: string;
  guestPhone: string;
  specialRequests?: string;
  expectedTotal?: number;
};

export async function createBooking(user: SessionUser, input: CreateBookingInput) {
  const settings = await getSettings();

  let booking;
  try {
    booking = await db.$transaction(
      async (tx) => {
        // Serialise bookings per property: concurrent requests for the same
        // property queue here, so availability checks below can't race.
        const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM properties WHERE id = ${input.propertyId} FOR UPDATE`;
        if (locked.length === 0) throw new AppError("NOT_FOUND", "Property not found.");
        const property = await tx.property.findUniqueOrThrow({ where: { id: input.propertyId } });
        const { checkIn, checkOut, nights } = await validateStay(property, input, settings);

        await runBookingMaintenance({ propertyId: property.id, tx });
        const ranges = await getUnavailableRanges(property.id, checkIn, checkOut, tx);
        if (ranges.length > 0) {
          throw new AppError("DATES_UNAVAILABLE", "Sorry — those dates were just booked. Please choose different dates.");
        }

        const offers = await activeOffersFor(property.id, tx);
        const quote = computeQuote({ basePrice: property.basePrice, cleaningFee: property.cleaningFee, checkIn, nights, offers });
        if (input.expectedTotal !== undefined && input.expectedTotal !== quote.total) {
          throw new AppError("PRICE_CHANGED", `The price for these dates is now ${formatMoney(quote.total, property.currency)}. Please review and confirm again.`);
        }

        const created = await tx.booking.create({
          data: {
            reference: bookingReference(),
            propertyId: property.id,
            userId: user.id,
            checkIn,
            checkOut,
            nights,
            adults: input.adults,
            children: input.children,
            infants: input.infants,
            status: "PENDING",
            currency: property.currency,
            nightlyRate: quote.nightlyRate,
            subtotal: quote.subtotal,
            discountAmount: quote.discountAmount,
            cleaningFee: quote.cleaningFee,
            total: quote.total,
            offerId: quote.offer?.id ?? null,
            guestName: user.name,
            guestEmail: user.email,
            guestPhone: input.guestPhone,
            specialRequests: input.specialRequests || null,
            expiresAt: new Date(Date.now() + settings.bookingHoldHours * 3_600_000),
          },
          include: { property: { select: { name: true, slug: true } } },
        });
        await tx.bookingStatusEvent.create({
          data: { bookingId: created.id, toStatus: "PENDING", actorId: user.id, note: "Booking requested" },
        });
        if (input.guestPhone !== user.phone) {
          await tx.user.update({ where: { id: user.id }, data: { phone: input.guestPhone } });
        }
        return created;
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  } catch (error) {
    // Last line of defence: the database exclusion constraint.
    if (pgErrorCode(error) === EXCLUSION_VIOLATION) {
      throw new AppError("DATES_UNAVAILABLE", "Sorry — those dates were just booked. Please choose different dates.");
    }
    throw error;
  }

  const dates = formatDateRange(booking.checkIn, booking.checkOut);
  await Promise.all([
    publish(`availability:${booking.propertyId}`, "changed"),
    publish("admin", "booking", { id: booking.id }),
    notifyUser(user.id, {
      type: "booking.created",
      title: `Booking request received — ${booking.reference}`,
      body: `We've reserved ${booking.property.name} for ${dates} (${formatMoney(booking.total, booking.currency)}). Our team will confirm within ${settings.bookingHoldHours} hours; the dates are held for you until then.`,
      link: `/account/bookings/${booking.reference}`,
    }),
    notifyAdmins({
      type: "booking.created",
      title: `New booking request ${booking.reference}`,
      body: `${booking.guestName} requested ${booking.property.name} for ${dates} (${formatMoney(booking.total, booking.currency)}).`,
      link: `/admin/bookings/${booking.id}`,
    }),
    audit({ actorId: user.id, action: "booking.create", entityType: "booking", entityId: booking.id }),
  ]);
  return booking;
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

const STATUS_COPY: Partial<Record<BookingStatus, { title: string; body: string }>> = {
  AWAITING_PAYMENT: { title: "Your booking is approved — payment pending", body: "Your stay is approved. Please complete payment using the instructions from our team to secure it." },
  CONFIRMED: { title: "Your booking is confirmed", body: "Your stay is confirmed. We look forward to hosting you!" },
  PAID: { title: "Payment received", body: "We've recorded your payment. Thank you!" },
  CANCELLED: { title: "Your booking was cancelled", body: "Your booking has been cancelled." },
  REFUNDED: { title: "Your refund has been processed", body: "Your booking has been refunded." },
  EXPIRED: { title: "Your booking request expired", body: "The hold on your dates expired before the booking was confirmed." },
};

export async function transitionBooking(
  actor: SessionUser,
  bookingId: string,
  to: BookingStatus,
  opts: { note?: string; reason?: string } = {},
) {
  const settings = await getSettings();
  const updated = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
    if (rows.length === 0) throw new AppError("NOT_FOUND", "Booking not found.");
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });

    const isAdmin = actor.role === "ADMIN";
    const isOwner = booking.userId === actor.id;
    if (!isAdmin) {
      if (!isOwner) throw new AppError("NOT_FOUND", "Booking not found.");
      if (to !== "CANCELLED" || !CUSTOMER_CANCELLABLE.includes(booking.status)) {
        throw new AppError("FORBIDDEN", "This booking can't be changed online. Please message us for help.");
      }
      if (booking.checkIn <= today()) {
        throw new AppError("FORBIDDEN", "Bookings can't be cancelled online on or after the check-in date. Please message us.");
      }
    }
    if (!canTransition(booking.status, to)) {
      throw new AppError("INVALID_TRANSITION", `A ${booking.status.toLowerCase().replace("_", " ")} booking can't be moved to ${to.toLowerCase().replace("_", " ")}.`);
    }

    const now = new Date();
    const next = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: to,
        ...(to === "AWAITING_PAYMENT" ? { expiresAt: new Date(now.getTime() + settings.bookingHoldHours * 3_600_000) } : {}),
        ...(to === "CONFIRMED" || to === "PAID" ? { expiresAt: null, confirmedAt: booking.confirmedAt ?? now } : {}),
        ...(to === "CANCELLED" ? { cancelledAt: now, cancellationReason: opts.reason ?? null, expiresAt: null } : {}),
      },
      include: { property: { select: { name: true } } },
    });
    await tx.bookingStatusEvent.create({
      data: { bookingId, fromStatus: booking.status, toStatus: to, actorId: actor.id, note: opts.note ?? opts.reason ?? null },
    });
    await audit({ actorId: actor.id, action: `booking.${to.toLowerCase()}`, entityType: "booking", entityId: bookingId, metadata: { from: booking.status } }, tx);
    return next;
  });

  await publish(`availability:${updated.propertyId}`, "changed");
  await publish("admin", "booking", { id: updated.id });
  if (updated.userId) {
    await publish(`user:${updated.userId}`, "booking", { id: updated.id });
    const copy = STATUS_COPY[to];
    if (copy && updated.userId !== actor.id) {
      await notifyUser(updated.userId, {
        type: to === "CANCELLED" ? "booking.cancelled" : "booking.updated",
        title: `${copy.title} — ${updated.reference}`,
        body: `${copy.body} (${updated.property.name}, ${formatDateRange(updated.checkIn, updated.checkOut)})${opts.reason ? ` Reason: ${opts.reason}` : ""}`,
        link: `/account/bookings/${updated.reference}`,
      });
    }
  }
  if (actor.role !== "ADMIN" && to === "CANCELLED") {
    await notifyAdmins({
      type: "booking.cancelled",
      title: `Booking ${updated.reference} cancelled by guest`,
      body: `${updated.guestName} cancelled ${updated.property.name} (${formatDateRange(updated.checkIn, updated.checkOut)}).${opts.reason ? ` Reason: ${opts.reason}` : ""}`,
      link: `/admin/bookings/${updated.id}`,
    });
  }
  return updated;
}

/** Admin: extend the hold on a pending booking. */
export async function extendHold(admin: SessionUser, bookingId: string, hours: number) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");
  if (!["PENDING", "AWAITING_PAYMENT"].includes(booking.status)) throw new AppError("INVALID_TRANSITION", "Only pending bookings have a hold to extend.");
  const base = booking.expiresAt && booking.expiresAt > new Date() ? booking.expiresAt : new Date();
  await db.booking.update({ where: { id: bookingId }, data: { expiresAt: new Date(base.getTime() + hours * 3_600_000) } });
  await audit({ actorId: admin.id, action: "booking.extend_hold", entityType: "booking", entityId: bookingId, metadata: { hours } });
}

// ---------------------------------------------------------------------------
// Payments (manual recording now; provider integrations via server/payments)
// ---------------------------------------------------------------------------

export async function recordManualPayment(
  admin: SessionUser,
  bookingId: string,
  input: { amount: number; method: string; reference?: string; markConfirmed: boolean },
) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");
  if (["CANCELLED", "EXPIRED", "REFUNDED"].includes(booking.status)) {
    throw new AppError("INVALID_TRANSITION", "Payments can't be recorded against a cancelled or expired booking.");
  }
  try {
    await db.payment.create({
      data: {
        bookingId,
        provider: "manual",
        providerRef: input.reference || null,
        method: input.method,
        amount: input.amount,
        currency: booking.currency,
        status: "SUCCEEDED",
        recordedById: admin.id,
      },
    });
  } catch (error) {
    if (pgErrorCode(error) === "23505") throw new AppError("CONFLICT", "A payment with that reference has already been recorded.");
    throw error;
  }
  await audit({ actorId: admin.id, action: "payment.record", entityType: "booking", entityId: bookingId, metadata: { amount: input.amount, method: input.method } });
  const paid = await db.payment.aggregate({ where: { bookingId, status: "SUCCEEDED" }, _sum: { amount: true } });
  if ((paid._sum.amount ?? 0) >= booking.total && canTransition(booking.status, "PAID")) {
    await transitionBooking(admin, bookingId, "PAID", { note: "Payment recorded in full" });
  } else if (input.markConfirmed && canTransition(booking.status, "CONFIRMED")) {
    await transitionBooking(admin, bookingId, "CONFIRMED", { note: "Deposit recorded" });
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const bookingCardSelect = {
  id: true,
  reference: true,
  status: true,
  checkIn: true,
  checkOut: true,
  nights: true,
  adults: true,
  children: true,
  infants: true,
  total: true,
  currency: true,
  expiresAt: true,
  createdAt: true,
  property: {
    select: {
      id: true,
      name: true,
      slug: true,
      destination: { select: { name: true } },
      images: { orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }], take: 1, select: { url: true, storageKey: true, alt: true } },
    },
  },
  review: { select: { id: true } },
};

export async function listBookingsForUser(userId: string) {
  return db.booking.findMany({ where: { userId }, orderBy: [{ checkIn: "desc" }], select: bookingCardSelect });
}

export async function getBookingForUser(user: SessionUser, reference: string) {
  const booking = await db.booking.findUnique({
    where: { reference },
    include: {
      property: {
        include: {
          destination: { select: { name: true, slug: true } },
          images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], take: 1 },
        },
      },
      events: { orderBy: { createdAt: "asc" }, select: { id: true, toStatus: true, createdAt: true, note: true } },
      payments: { where: { status: "SUCCEEDED" }, select: { amount: true, currency: true, createdAt: true, method: true } },
      review: { select: { id: true } },
      conversations: { select: { id: true }, take: 1 },
    },
  });
  // Customers may only see their own bookings; admins see all.
  if (!booking || (booking.userId !== user.id && user.role !== "ADMIN")) return null;
  return booking;
}

export function stayIsReviewable(b: { status: BookingStatus; checkOut: Date }) {
  return (b.status === "COMPLETED" || ((b.status === "CONFIRMED" || b.status === "PAID") && b.checkOut <= today()));
}

export { toIsoDate };
