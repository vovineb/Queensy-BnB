// Calendar-date helpers. Stay dates are plain calendar dates ("YYYY-MM-DD"),
// represented at runtime as Date objects at 00:00 UTC so they never shift
// with the viewer's or server's timezone.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function parseIsoDate(value: string): Date {
  if (!isIsoDate(value)) throw new Error(`Invalid date: ${value}`);
  return new Date(`${value}T00:00:00Z`);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / DAY_MS);
}

/** Today's calendar date in the given IANA timezone, as a UTC-midnight Date. */
export function todayInTimeZone(timeZone: string, now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseIsoDate(parts);
}

/** Every night of a stay: [checkIn, checkOut). */
export function eachNight(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) nights.push(d);
  return nights;
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** The instant `days` days before now. */
export function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * DAY_MS);
}
