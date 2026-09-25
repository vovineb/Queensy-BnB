import "server-only";
import { db, type Tx } from "@/server/db";
import { publish } from "@/server/realtime";
import { addDays, parseIsoDate, todayInTimeZone, toIsoDate } from "@/lib/dates";
import { Prisma, type BookingStatus } from "@/generated/prisma/client";

/** Statuses that occupy dates. Must match the `bookings_no_overlap` constraint. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["PENDING", "AWAITING_PAYMENT", "PAID", "CONFIRMED", "COMPLETED"];

export const timeZone = () => process.env.DEFAULT_TIMEZONE || "Africa/Nairobi";
export const today = () => todayInTimeZone(timeZone());

type ExpiredRow = { id: string; property_id: string; user_id: string | null; from_status: BookingStatus };

/**
 * Releases lapsed holds (PENDING / AWAITING_PAYMENT past expires_at) and marks
 * finished stays as COMPLETED. Safe to run concurrently (SKIP LOCKED).
 */
export async function runBookingMaintenance(opts: { propertyId?: string; tx?: Tx } = {}) {
  const client = opts.tx ?? db;
  const scope = opts.propertyId ? Prisma.sql`AND property_id = ${opts.propertyId}` : Prisma.empty;
  const expired = await client.$queryRaw<ExpiredRow[]>(Prisma.sql`
    WITH due AS (
      SELECT id, status FROM bookings
      WHERE status IN ('PENDING','AWAITING_PAYMENT') AND expires_at < now() ${scope}
      FOR UPDATE SKIP LOCKED)
    UPDATE bookings b SET status = 'EXPIRED', updated_at = now()
    FROM due WHERE b.id = due.id
    RETURNING b.id, b.property_id, b.user_id, due.status AS from_status`);

  const todayDate = toIsoDate(today());
  const completed = await client.$queryRaw<ExpiredRow[]>(Prisma.sql`
    WITH due AS (
      SELECT id, status FROM bookings
      WHERE status IN ('PAID','CONFIRMED') AND check_out <= ${todayDate}::date ${scope}
      FOR UPDATE SKIP LOCKED)
    UPDATE bookings b SET status = 'COMPLETED', updated_at = now()
    FROM due WHERE b.id = due.id
    RETURNING b.id, b.property_id, b.user_id, due.status AS from_status`);

  const events = [
    ...expired.map((r) => ({ bookingId: r.id, fromStatus: r.from_status, toStatus: "EXPIRED" as const, note: "Hold expired without confirmation" })),
    ...completed.map((r) => ({ bookingId: r.id, fromStatus: r.from_status, toStatus: "COMPLETED" as const, note: "Stay completed" })),
  ];
  if (events.length > 0) await client.bookingStatusEvent.createMany({ data: events });

  if (!opts.tx) {
    for (const propertyId of new Set(expired.map((r) => r.property_id))) {
      await publish(`availability:${propertyId}`, "changed");
    }
    for (const r of [...expired, ...completed]) {
      if (r.user_id) await publish(`user:${r.user_id}`, "booking", { id: r.id });
    }
    if (events.length > 0) await publish("admin", "booking", {});
  }
  return { expired: expired.length, completed: completed.length };
}

let lastMaintenance = 0;
/** Opportunistic maintenance (at most once a minute per instance) in addition to the cron endpoint. */
export async function maybeRunMaintenance() {
  if (Date.now() - lastMaintenance < 60_000) return;
  lastMaintenance = Date.now();
  await runBookingMaintenance().catch((e) => console.error("[maintenance] failed", e));
}

export type DateRange = { start: string; end: string }; // [start, end) ISO dates

/** Unavailable ranges (active bookings + admin blocks) for a property within a window. */
export async function getUnavailableRanges(propertyId: string, from: Date, to: Date, tx: Tx | typeof db = db): Promise<DateRange[]> {
  const [bookings, blocks] = await Promise.all([
    tx.booking.findMany({
      where: {
        propertyId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkIn: { lt: to },
        checkOut: { gt: from },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { checkIn: true, checkOut: true },
    }),
    tx.availabilityBlock.findMany({
      where: { propertyId, startDate: { lt: to }, endDate: { gt: from } },
      select: { startDate: true, endDate: true },
    }),
  ]);
  const ranges = [
    ...bookings.map((b) => ({ start: b.checkIn, end: b.checkOut })),
    ...blocks.map((b) => ({ start: b.startDate, end: b.endDate })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping/adjacent ranges.
  const merged: { start: Date; end: Date }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      if (r.end > last.end) last.end = r.end;
    } else merged.push({ ...r });
  }
  return merged.map((r) => ({ start: toIsoDate(r.start), end: toIsoDate(r.end) }));
}

export async function isRangeAvailable(propertyId: string, checkIn: Date, checkOut: Date, tx: Tx | typeof db = db) {
  const ranges = await getUnavailableRanges(propertyId, checkIn, checkOut, tx);
  return ranges.length === 0;
}

/** Calendar payload for the date picker: unavailable ranges from today to the booking horizon. */
export async function getCalendar(propertyId: string, horizonDays: number) {
  const start = today();
  const end = addDays(start, horizonDays);
  return { today: toIsoDate(start), lastDate: toIsoDate(end), unavailable: await getUnavailableRanges(propertyId, start, end) };
}

export { parseIsoDate };
