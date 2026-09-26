// Pure transformation from legacy Firestore documents to new-schema rows.
// Kept free of I/O so it can be unit tested (tests/unit/migrate-firestore.test.ts).

type Doc = { id: string } & Record<string, unknown>;
export type LegacyData = { Properties?: Doc[]; Bookings?: Doc[]; Reviews?: Doc[]; Tickets?: Doc[] };

type Ctx = {
  properties: { id: string; name: string; slug: string; legacyId: string | null; currency: string }[];
  amenities: { id: string; slug: string; name: string }[];
  destinationId: string | null;
  alreadyImported: { properties: Set<string>; bookings: Set<string>; reviews: Set<string>; inquiries: Set<string> };
  existingActive: { propertyId: string; checkIn: Date; checkOut: Date; reference: string }[];
  now: Date;
};

const DAY = 86_400_000;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number.parseFloat(str(v));
  return Number.isFinite(n) ? n : null;
};
const date = (v: unknown): Date | null => {
  const s = str(v);
  if (!s) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
const dayOnly = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const clampRating = (v: unknown) => Math.min(5, Math.max(1, Math.round(num(v) ?? 5)));

const AMENITY_ALIASES: Record<string, string> = {
  wifi: "wifi", "wi-fi": "wifi", ac: "air-conditioning", "air conditioning": "air-conditioning", fan: "fan", kitchen: "kitchen",
  pool: "pool", "swimming pool": "pool", tub: "bathtub", bathtub: "bathtub", "beach access": "beach-access", security: "security",
  parking: "parking", tv: "tv",
};

export function transformLegacy(data: LegacyData, ctx: Ctx) {
  const warnings: string[] = [];
  const propertyIdByLegacyName = new Map(ctx.properties.map((p) => [p.name.toLowerCase(), p.id]));
  const usedSlugs = new Set(ctx.properties.map((p) => p.slug));

  // --- Properties -------------------------------------------------------------
  const properties = [];
  for (const doc of data.Properties ?? []) {
    const name = str(doc.name);
    if (!name) {
      warnings.push(`Property ${doc.id}: missing name — skipped`);
      continue;
    }
    if (ctx.alreadyImported.properties.has(doc.id) || propertyIdByLegacyName.has(name.toLowerCase())) {
      warnings.push(`Property "${name}" already exists — skipped (add its photos from the admin if needed)`);
      continue;
    }
    const price = num(doc.price);
    const beds = Math.max(1, Math.round(num(doc.beds) ?? 1));
    let slug = slugify(name) || `property-${doc.id.toLowerCase()}`;
    while (usedSlugs.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    usedSlugs.add(slug);
    const amenityIds = (Array.isArray(doc.amenities) ? doc.amenities : [])
      .map((a) => AMENITY_ALIASES[str(a).toLowerCase()] ?? slugify(str(a)))
      .map((slug) => ctx.amenities.find((a) => a.slug === slug)?.id)
      .filter((id): id is string => Boolean(id));
    const images = (Array.isArray(doc.images) ? doc.images : [])
      .map(str)
      .filter((u) => /^https:\/\//.test(u))
      .map((url, i) => ({ url, alt: `${name} photo ${i + 1}`, sortOrder: i, isCover: i === 0 }));
    const description = str(doc.description) || `${name} in Diani.`;
    properties.push({
      legacyId: doc.id,
      slug,
      name,
      type: "APARTMENT" as const,
      status: "DRAFT" as const, // admin reviews details, then publishes
      summary: description.slice(0, 160),
      description,
      destinationId: ctx.destinationId,
      bedrooms: beds,
      beds,
      bathrooms: 1,
      maxGuests: beds * 2,
      currency: "KES",
      basePrice: Math.round((price ?? 0) * 100),
      amenityIds: [...new Set(amenityIds)],
      images,
    });
    if (price === null) warnings.push(`Property "${name}": missing price — imported as draft with price 0`);
  }

  // --- Bookings ---------------------------------------------------------------
  const occupied = ctx.existingActive.map((b) => ({ ...b }));
  const bookings = [];
  const sorted = [...(data.Bookings ?? [])].sort((a, b) => str(a.createdAt).localeCompare(str(b.createdAt)));
  const today = dayOnly(ctx.now);
  for (const doc of sorted) {
    if (ctx.alreadyImported.bookings.has(doc.id)) continue;
    const propertyName = str(doc.property);
    const propertyId = propertyIdByLegacyName.get(propertyName.toLowerCase()) ?? null;
    const importedProperty = properties.find((p) => p.name.toLowerCase() === propertyName.toLowerCase());
    if (!propertyId && !importedProperty) {
      warnings.push(`Booking ${doc.id}: unknown property "${propertyName}" — skipped`);
      continue;
    }
    const checkIn = date(doc.checkIn);
    const checkOut = date(doc.checkOut);
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      warnings.push(`Booking ${doc.id}: invalid dates (${str(doc.checkIn)} → ${str(doc.checkOut)}) — skipped`);
      continue;
    }
    const ci = dayOnly(checkIn);
    const co = dayOnly(checkOut);
    const nights = Math.round((co.getTime() - ci.getTime()) / DAY);
    const total = Math.max(0, Math.round((num(doc.totalAmount) ?? 0) * 100));
    const email = str(doc.email).toLowerCase();
    const createdAt = date(doc.createdAt) ?? ctx.now;
    const key = propertyId ?? `new:${propertyName.toLowerCase()}`;

    let status: "PENDING" | "EXPIRED" | "CANCELLED";
    let note: string;
    const clash = occupied.find((o) => o.propertyId === key && ci < o.checkOut && o.checkIn < co);
    if (co <= today) {
      status = "EXPIRED";
      note = "Imported from legacy system. Stay dates have passed; payment status was not recorded by the old site.";
    } else if (clash) {
      status = "CANCELLED";
      note = `Imported from legacy system. Overlapped with booking ${clash.reference}; please contact the guest.`;
      warnings.push(`Booking ${doc.id} (${email}) overlaps ${clash.reference} — imported as CANCELLED for follow-up`);
    } else {
      status = "PENDING";
      note = "Imported from legacy system. Confirm or cancel after checking with the guest.";
      occupied.push({ propertyId: key, checkIn: ci, checkOut: co, reference: `QB-L-${doc.id}` });
    }
    bookings.push({
      legacyId: doc.id,
      reference: `QB-L-${doc.id}`.slice(0, 40),
      propertyId,
      propertyName,
      checkIn: ci,
      checkOut: co,
      nights,
      adults: 1,
      status,
      currency: "KES",
      nightlyRate: nights > 0 ? Math.round(total / nights) : total,
      subtotal: total,
      total,
      guestName: str(doc.name) || "Guest",
      guestEmail: email || "unknown@invalid",
      createdAt,
      expiresAt: status === "PENDING" ? new Date(ctx.now.getTime() + 7 * DAY) : null,
      note,
    });
  }

  // --- Reviews ----------------------------------------------------------------
  const reviews = [];
  for (const doc of data.Reviews ?? []) {
    if (ctx.alreadyImported.reviews.has(doc.id)) continue;
    const propertyName = str(doc.property);
    const propertyId = propertyIdByLegacyName.get(propertyName.toLowerCase()) ?? null;
    if (!propertyId && !properties.some((p) => p.name.toLowerCase() === propertyName.toLowerCase())) {
      warnings.push(`Review ${doc.id}: unknown property "${propertyName}" — skipped`);
      continue;
    }
    const r = {
      hostRating: clampRating(doc.hostRating),
      amenitiesRating: clampRating(doc.amenitiesRating),
      cleanlinessRating: clampRating(doc.cleanlinessRating),
      neighborhoodRating: clampRating(doc.neighborhoodRating),
    };
    reviews.push({
      legacyId: doc.id,
      propertyId,
      propertyName,
      authorName: str(doc.name).split(" ")[0] || "Guest",
      ...r,
      rating: Math.round(((r.hostRating + r.amenitiesRating + r.cleanlinessRating + r.neighborhoodRating) / 4) * 10) / 10,
      comment: str(doc.recommendation) || null,
      status: "HIDDEN" as const, // unverified — anyone could submit on the old site
      createdAt: date(doc.createdAt) ?? ctx.now,
    });
  }

  // --- Tickets → Inquiries ----------------------------------------------------
  const STATUS: Record<string, "NEW" | "IN_PROGRESS" | "CLOSED"> = { Pending: "NEW", "In Progress": "IN_PROGRESS", Resolved: "CLOSED" };
  const inquiries = [];
  for (const doc of data.Tickets ?? []) {
    if (ctx.alreadyImported.inquiries.has(doc.id)) continue;
    const email = str(doc.email).toLowerCase();
    inquiries.push({
      legacyId: doc.id,
      name: str(doc.name) || "Guest",
      email: email && email !== "unknown" ? email : null,
      topic: str(doc.issueType) || "Other",
      message: str(doc.description) || "(no description)",
      attachmentUrl: /^https:\/\//.test(str(doc.imageURL)) ? str(doc.imageURL) : null,
      status: STATUS[str(doc.status)] ?? "NEW",
      createdAt: date(doc.createdAt) ?? ctx.now,
    });
  }

  return { properties, bookings, reviews, inquiries, warnings, propertyIdByLegacyName };
}
