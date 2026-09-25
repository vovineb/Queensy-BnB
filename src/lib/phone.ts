// Full ("max") metadata gives precise per-country validation. Import this
// module from server code; client components use ./countries instead.
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export type PhoneParseResult =
  | { ok: true; e164: string; country: string | undefined; international: string }
  | { ok: false; error: string };

/** Validates a phone number from any country and normalises it to E.164. */
export function parsePhone(input: string, defaultCountry?: string): PhoneParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Enter a phone number" };
  const phone = parsePhoneNumberFromString(raw, defaultCountry as CountryCode | undefined);
  if (!phone || !phone.isValid()) {
    return { ok: false, error: "Enter a valid phone number, including the country code" };
  }
  return { ok: true, e164: phone.number, country: phone.country, international: phone.formatInternational() };
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

