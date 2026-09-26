// Centralised input validation shared by forms (client) and actions (server).
import { z } from "zod";
import { isIsoDate } from "./dates";
import { parsePhone } from "./phone";

export const PASSWORD_MIN = 10;

const trimmed = (max: number) => z.string().trim().max(max);
const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(200, "Password is too long");

export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const parsed = parsePhone(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.error });
      return z.NEVER;
    }
    return parsed.e164;
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const parsed = parsePhone(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.error });
      return z.NEVER;
    }
    return parsed.e164;
  });

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const isoDateSchema = z.string().refine(isIsoDate, "Enter a valid date");

// --- Auth --------------------------------------------------------------------

export const signUpSchema = z.object({
  name: requiredText("Full name", 120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  acceptTerms: checkbox.refine((v) => v, "Please accept the terms and privacy notice to continue"),
  marketingEmail: checkbox,
  marketingSms: checkbox,
  marketingWhatsapp: checkbox,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ token: z.string().min(20).max(200), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password"), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export const profileSchema = z.object({
  name: requiredText("Full name", 120),
  phone: phoneSchema,
});

export const marketingPreferencesSchema = z.object({
  email: checkbox,
  sms: checkbox,
  whatsapp: checkbox,
});

// --- Search ------------------------------------------------------------------

export const SORT_OPTIONS = ["recommended", "price_asc", "price_desc", "rating", "newest"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30) : []));

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
    });

export const searchParamsSchema = z.object({
  q: trimmed(100).optional().catch(undefined),
  destination: trimmed(80).optional().catch(undefined),
  checkIn: isoDateSchema.optional().catch(undefined),
  checkOut: isoDateSchema.optional().catch(undefined),
  guests: optionalInt(1, 50).catch(undefined),
  type: csv.catch([]),
  amenities: csv.catch([]),
  minPrice: optionalInt(0, 100_000_000).catch(undefined),
  maxPrice: optionalInt(0, 100_000_000).catch(undefined),
  bedrooms: optionalInt(0, 20).catch(undefined),
  bathrooms: optionalInt(0, 20).catch(undefined),
  rating: optionalInt(1, 5).catch(undefined),
  offers: z.string().optional().transform((v) => v === "1").catch(false),
  sort: z.enum(SORT_OPTIONS).optional().catch(undefined),
  page: optionalInt(1, 500).catch(undefined),
});
export type SearchFilters = z.infer<typeof searchParamsSchema>;

// --- Booking -----------------------------------------------------------------

export const bookingRequestSchema = z
  .object({
    propertyId: z.string().min(1).max(64),
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    adults: z.coerce.number().int().min(1, "At least one adult is required").max(50),
    children: z.coerce.number().int().min(0).max(50).default(0),
    infants: z.coerce.number().int().min(0).max(20).default(0),
    guestPhone: phoneSchema,
    specialRequests: trimmed(1000).optional(),
    expectedTotal: z.coerce.number().int().min(0).optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] });

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1).max(64),
  reason: trimmed(500).optional(),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1).max(64),
  hostRating: z.coerce.number().int().min(1).max(5),
  amenitiesRating: z.coerce.number().int().min(1).max(5),
  cleanlinessRating: z.coerce.number().int().min(1).max(5),
  neighborhoodRating: z.coerce.number().int().min(1).max(5),
  comment: trimmed(2000).optional(),
});

// --- Messaging & inquiries ---------------------------------------------------

export const messageBodySchema = requiredText("Message", 4000);

export const newConversationSchema = z.object({
  subject: requiredText("Subject", 140),
  body: messageBodySchema,
  propertyId: z.string().max(64).optional(),
  bookingId: z.string().max(64).optional(),
});

export const INQUIRY_TOPICS = ["Booking question", "Availability", "Long stay", "Corporate stay", "Feedback", "Other"] as const;

export const inquirySchema = z.object({
  name: requiredText("Name", 120),
  email: emailSchema,
  phone: optionalPhoneSchema,
  topic: z.enum(INQUIRY_TOPICS),
  message: requiredText("Message", 4000),
  propertyId: z.string().max(64).optional(),
  marketingEmail: checkbox,
  // Honeypot field; bots fill it in, humans never see it.
  website: z.string().max(0).optional().or(z.literal("")),
});

export const newsletterSchema = z.object({
  email: emailSchema,
  consent: checkbox.refine((v) => v, "Please confirm you'd like to receive emails"),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type FieldErrors = Record<string, string[] | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
