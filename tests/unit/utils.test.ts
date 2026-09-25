import { describe, expect, it } from "vitest";
import { addDays, eachNight, isIsoDate, nightsBetween, parseIsoDate, todayInTimeZone, toIsoDate } from "@/lib/dates";
import { formatMoney, toMinorUnits, fromMinorUnits } from "@/lib/format";
import { parsePhone } from "@/lib/phone";
import { bookingRequestSchema, searchParamsSchema, signUpSchema } from "@/lib/validation";
import { safeNextPath } from "@/server/auth/guards";

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("26-2-3")).toBe(false);
  });
  it("counts nights and iterates stays without timezone drift", () => {
    const a = parseIsoDate("2026-03-28");
    const b = parseIsoDate("2026-04-02");
    expect(nightsBetween(a, b)).toBe(5);
    expect(eachNight(a, b).map(toIsoDate)).toEqual(["2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31", "2026-04-01"]);
    expect(toIsoDate(addDays(a, 4))).toBe("2026-04-01");
  });
  it("computes 'today' in Nairobi, not UTC", () => {
    // 22:30 UTC on 31 Dec is already 1 Jan in Nairobi (UTC+3).
    expect(toIsoDate(todayInTimeZone("Africa/Nairobi", new Date("2026-12-31T22:30:00Z")))).toBe("2027-01-01");
  });
});

describe("money", () => {
  it("formats minor units with the currency code", () => {
    expect(formatMoney(550000, "KES", "en-KE")).toBe("KES 5,500");
    expect(formatMoney(12345, "USD", "en-US")).toBe("USD 123.45");
    expect(toMinorUnits(5500, "KES")).toBe(550000);
    expect(fromMinorUnits(550000, "KES")).toBe(5500);
    expect(toMinorUnits(1000, "JPY")).toBe(1000);
  });
});

describe("phone numbers", () => {
  it("accepts international numbers and normalises to E.164", () => {
    expect(parsePhone("+254 712 345 678")).toMatchObject({ ok: true, e164: "+254712345678", country: "KE" });
    expect(parsePhone("+44 20 7946 0958")).toMatchObject({ ok: true, e164: "+442079460958", country: "GB" });
    expect(parsePhone("+1 415 555 2671")).toMatchObject({ ok: true, country: "US" });
    expect(parsePhone("0712345678", "KE")).toMatchObject({ ok: true, e164: "+254712345678" });
  });
  it("rejects invalid numbers", () => {
    expect(parsePhone("12345").ok).toBe(false);
    expect(parsePhone("+254 12").ok).toBe(false);
  });
});

describe("validation", () => {
  const base = { name: "Amina", email: "AMINA@Example.com ", phone: "+254712345678", password: "a-long-password", acceptTerms: "on" };
  it("normalises sign-up input and keeps marketing opt-in explicit", () => {
    const r = signUpSchema.parse(base);
    expect(r.email).toBe("amina@example.com");
    expect(r.marketingEmail).toBe(false);
    expect(r.marketingSms).toBe(false);
  });
  it("requires accepting terms, a valid phone and a long enough password", () => {
    expect(signUpSchema.safeParse({ ...base, acceptTerms: undefined }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, phone: "0000" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
  });
  it("rejects bookings whose check-out is not after check-in", () => {
    expect(bookingRequestSchema.safeParse({ propertyId: "p", checkIn: "2026-10-05", checkOut: "2026-10-05", adults: 1, guestPhone: "+254712345678" }).success).toBe(false);
  });
  it("tolerates junk search params instead of erroring", () => {
    const r = searchParamsSchema.parse({ guests: "abc", sort: "hack", checkIn: "nope", minPrice: "-5", type: "VILLA,APARTMENT" });
    expect(r.guests).toBeUndefined();
    expect(r.sort).toBeUndefined();
    expect(r.checkIn).toBeUndefined();
    expect(r.minPrice).toBe(0);
    expect(r.type).toEqual(["VILLA", "APARTMENT"]);
  });
});

describe("safeNextPath (open-redirect protection)", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNextPath("/account/bookings")).toBe("/account/bookings");
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
    expect(safeNextPath(undefined, "/admin")).toBe("/admin");
  });
});
