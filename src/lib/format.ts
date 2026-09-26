// Locale-aware formatting. Never hard-code currency symbols or date formats in UI.

export const DEFAULT_LOCALE = "en-KE";

const fractionDigitsCache = new Map<string, number>();

/** Number of minor-unit digits for a currency (KES/USD = 2, JPY = 0...). */
export function currencyFractionDigits(currency: string): number {
  const cached = fractionDigitsCache.get(currency);
  if (cached !== undefined) return cached;
  const digits =
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  fractionDigitsCache.set(currency, digits);
  return digits;
}

export function toMinorUnits(major: number, currency: string): number {
  return Math.round(major * 10 ** currencyFractionDigits(currency));
}

export function fromMinorUnits(minor: number, currency: string): number {
  return minor / 10 ** currencyFractionDigits(currency);
}

/** Formats minor units, dropping decimals for whole amounts (KES 5,500 not KES 5,500.00). */
export function formatMoney(minor: number, currency: string, locale = DEFAULT_LOCALE): string {
  const digits = currencyFractionDigits(currency);
  const major = minor / 10 ** digits;
  const whole = minor % 10 ** digits === 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: digits,
  })
    .format(major)
    .replace(/ /g, " ");
}

/** Formats a calendar date (UTC-midnight Date or ISO string) without timezone shifts. */
export function formatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
  locale = DEFAULT_LOCALE,
): string {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
}

/** Formats an instant (timestamp) in the given timezone. */
export function formatDateTime(
  value: Date | string,
  timeZone = "Africa/Nairobi",
  locale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(new Date(value));
}

export function formatDateRange(checkIn: Date | string, checkOut: Date | string, locale = DEFAULT_LOCALE) {
  const a = typeof checkIn === "string" ? new Date(`${checkIn}T00:00:00Z`) : checkIn;
  const b = typeof checkOut === "string" ? new Date(`${checkOut}T00:00:00Z`) : checkOut;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatRange(a, b);
}

export function formatRelativeTime(value: Date | string, now = new Date(), locale = DEFAULT_LOCALE): string {
  const diffSec = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return formatDateTime(value, undefined, locale, { dateStyle: "medium" });
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatRating(value: number | string) {
  return Number(value).toFixed(Number(value) % 1 === 0 ? 1 : 2).replace(/0$/, "");
}
