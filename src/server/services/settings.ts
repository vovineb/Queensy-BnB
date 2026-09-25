import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/server/db";

// Admin-editable site settings with safe defaults. Stored as one JSON row per key.
export const settingsSchema = z.object({
  siteName: z.string().trim().min(1).max(60).default("Queensy BnB"),
  tagline: z.string().trim().max(160).default("Handpicked stays across Kenya"),
  contactEmail: z.string().trim().max(254).default(""),
  contactPhone: z.string().trim().max(32).default(""),
  whatsappNumber: z.string().trim().max(32).default(""),
  supportHours: z.string().trim().max(120).default("Every day, 8:00–20:00 EAT"),
  heroTitle: z.string().trim().max(120).default("Stay better, wherever Kenya takes you"),
  heroSubtitle: z.string().trim().max(240).default("Handpicked homes and apartments with honest prices, real-time availability and a local team that answers."),
  heroImageUrl: z.string().trim().max(500).default(""),
  instagramUrl: z.string().trim().max(300).default(""),
  facebookUrl: z.string().trim().max(300).default(""),
  xUrl: z.string().trim().max(300).default(""),
  tiktokUrl: z.string().trim().max(300).default(""),
  bookingHoldHours: z.coerce.number().int().min(1).max(168).default(12),
  bookingHorizonDays: z.coerce.number().int().min(30).max(1095).default(540),
});

export type SiteSettings = z.infer<typeof settingsSchema>;
const SETTINGS_KEY = "site";

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const row = await db.setting.findUnique({ where: { key: SETTINGS_KEY } });
  const parsed = settingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : settingsSchema.parse({});
});

export async function saveSettings(values: SiteSettings) {
  await db.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: values },
    update: { value: values },
  });
}
