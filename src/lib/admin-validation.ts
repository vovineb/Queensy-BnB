import { z } from "zod";
import { isIsoDate } from "./dates";

const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const intField = (label: string, min: number, max: number) =>
  z.coerce.number({ error: `${label} must be a number` }).int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `${label} is too large`);
const money = (label: string) => z.coerce.number({ error: `${label} must be a number` }).min(0, `${label} can't be negative`).max(100_000_000);
const checkbox = z.union([z.literal("on"), z.literal("true"), z.literal(""), z.boolean()]).optional().transform((v) => v === true || v === "on" || v === "true");
const optDecimal = (min: number, max: number) =>
  z.string().trim().optional().transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) {
      ctx.addIssue({ code: "custom", message: `Enter a number between ${min} and ${max}` });
      return z.NEVER;
    }
    return n;
  });
const slug = z.string().trim().toLowerCase().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").optional().or(z.literal(""));
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");
const isoDate = z.string().refine(isIsoDate, "Enter a valid date");

export const PROPERTY_TYPES = ["APARTMENT", "STUDIO", "PENTHOUSE", "VILLA", "HOUSE", "COTTAGE", "SUITE", "ROOM"] as const;
export const CANCELLATION_POLICIES = ["FLEXIBLE", "MODERATE", "STRICT", "NON_REFUNDABLE"] as const;

export const propertySchema = z
  .object({
    name: text("Name", 120),
    slug,
    type: z.enum(PROPERTY_TYPES),
    featured: checkbox,
    summary: text("Short summary", 200),
    description: text("Description", 8000),
    destinationId: z.string().max(40).optional().transform((v) => v || null),
    neighborhood: optText(120),
    addressLine: optText(250),
    latitude: optDecimal(-90, 90),
    longitude: optDecimal(-180, 180),
    maxGuests: intField("Max guests", 1, 50),
    bedrooms: intField("Bedrooms", 0, 50),
    beds: intField("Beds", 0, 100),
    bathrooms: z.coerce.number().min(0).max(50).multipleOf(0.5, "Use whole or half numbers"),
    currency: z.string().trim().toUpperCase().length(3, "Use a 3-letter currency code (e.g. KES, USD)"),
    basePrice: money("Nightly price").refine((v) => v > 0, "Nightly price must be more than 0"),
    cleaningFee: money("Cleaning fee").default(0),
    minNights: intField("Minimum nights", 1, 365),
    maxNights: z.string().optional().transform((v, ctx) => {
      if (!v) return null;
      const n = Number.parseInt(v, 10);
      if (!Number.isFinite(n) || n < 1 || n > 1000) {
        ctx.addIssue({ code: "custom", message: "Enter a number of nights, or leave empty" });
        return z.NEVER;
      }
      return n;
    }),
    checkInTime: time,
    checkOutTime: time,
    houseRules: optText(4000),
    cancellationPolicy: z.enum(CANCELLATION_POLICIES),
    cancellationNotes: optText(1000),
    amenities: z.string().optional().transform((v) => (v ? v.split(",").filter(Boolean) : [])),
    rooms: z.string().optional().transform((v, ctx) => {
      if (!v) return [];
      try {
        const parsed = z.array(z.object({ name: z.string().trim().min(1).max(60), beds: z.string().trim().min(1).max(120) })).max(30).parse(JSON.parse(v));
        return parsed;
      } catch {
        ctx.addIssue({ code: "custom", message: "Each room needs a name and bed description" });
        return z.NEVER;
      }
    }),
  })
  .refine((v) => v.maxNights === null || v.maxNights >= v.minNights, { message: "Maximum nights must be at least the minimum", path: ["maxNights"] })
  .refine((v) => (v.latitude === null) === (v.longitude === null), { message: "Enter both latitude and longitude, or neither", path: ["longitude"] });

export const blockSchema = z
  .object({ propertyId: z.string().min(1), startDate: isoDate, endDate: isoDate, reason: optText(200) })
  .refine((v) => v.endDate > v.startDate, { message: "End date must be after the start date", path: ["endDate"] });

export const destinationSchema = z.object({
  name: text("Name", 80),
  slug,
  region: optText(80),
  country: z.string().trim().toUpperCase().length(2).default("KE"),
  summary: optText(300),
  description: optText(10000),
  imageUrl: optText(500),
  featured: checkbox,
  published: checkbox,
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const offerSchema = z
  .object({
    title: text("Title", 120),
    description: optText(1000),
    promoCopy: optText(160),
    imageUrl: optText(500),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.coerce.number().positive("Enter a discount"),
    minNights: intField("Minimum nights", 1, 365),
    startsAt: isoDate,
    endsAt: isoDate,
    active: checkbox,
    showBanner: checkbox,
    appliesToAll: checkbox,
    propertyIds: z.string().optional().transform((v) => (v ? v.split(",").filter(Boolean) : [])),
    notifySubscribers: checkbox,
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "End date must be after the start date", path: ["endsAt"] })
  .refine((v) => v.discountType !== "PERCENT" || (v.discountValue >= 1 && v.discountValue <= 100 && Number.isInteger(v.discountValue)), { message: "Percent must be a whole number from 1 to 100", path: ["discountValue"] })
  .refine((v) => v.appliesToAll || v.propertyIds.length > 0, { message: "Choose at least one property, or apply to all", path: ["propertyIds"] });

export const ANNOUNCEMENT_KINDS = ["PRICE_UPDATE", "NEW_PROPERTY", "SPECIAL_OFFER", "SEASONAL", "SERVICE"] as const;

export const announcementSchema = z
  .object({
    title: text("Title", 140),
    slug,
    body: text("Description", 8000),
    kind: z.enum(ANNOUNCEMENT_KINDS),
    imageUrl: optText(500),
    ctaLabel: optText(40),
    ctaUrl: z.string().trim().max(500).optional().transform((v) => v || null).refine((v) => !v || v.startsWith("/") || /^https:\/\//.test(v), "Use a site path like /offers or an https:// link"),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    publishAt: isoDate,
    expiresAt: z.string().optional().transform((v) => v || null).refine((v) => !v || isIsoDate(v), "Enter a valid date"),
    notifySubscribers: checkbox,
  })
  .refine((v) => !v.expiresAt || v.expiresAt > v.publishAt, { message: "Expiry must be after the publish date", path: ["expiresAt"] });

export const settingsFormSchema = z.object({
  siteName: text("Site name", 60),
  tagline: z.string().trim().max(160),
  contactEmail: z.string().trim().max(254).refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email"),
  contactPhone: z.string().trim().max(32),
  whatsappNumber: z.string().trim().max(32),
  supportHours: z.string().trim().max(120),
  heroTitle: text("Headline", 120),
  heroSubtitle: z.string().trim().max(240),
  heroImageUrl: z.string().trim().max(500),
  instagramUrl: z.string().trim().max(300),
  facebookUrl: z.string().trim().max(300),
  xUrl: z.string().trim().max(300),
  tiktokUrl: z.string().trim().max(300),
  bookingHoldHours: intField("Hold time", 1, 168),
  bookingHorizonDays: intField("Booking window", 30, 1095),
});

export const paymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.coerce.number().positive("Enter the amount received"),
  method: z.enum(["mpesa", "bank_transfer", "card", "cash", "other"]),
  reference: optText(80),
  markConfirmed: checkbox,
});

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
