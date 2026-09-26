import "server-only";
import { cache } from "react";
import { db } from "@/server/db";
import { parseIsoDate } from "@/lib/dates";
import { toMinorUnits } from "@/lib/format";
import type { SearchFilters } from "@/lib/validation";
import { Prisma, type PropertyType } from "@/generated/prisma/client";
import { ACTIVE_BOOKING_STATUSES } from "./availability";

export const PAGE_SIZE = 12;

const coverImage = {
  orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }],
  select: { id: true, url: true, storageKey: true, alt: true, width: true, height: true },
};

export const propertyCardSelect = {
  id: true,
  slug: true,
  name: true,
  type: true,
  summary: true,
  neighborhood: true,
  maxGuests: true,
  bedrooms: true,
  beds: true,
  bathrooms: true,
  basePrice: true,
  currency: true,
  ratingAverage: true,
  reviewCount: true,
  featured: true,
  createdAt: true,
  destination: { select: { name: true, slug: true } },
  images: { ...coverImage, take: 5 },
  amenities: { select: { amenity: { select: { slug: true, name: true } } }, take: 4 },
} satisfies Prisma.PropertySelect;

export type PropertyCardData = Prisma.PropertyGetPayload<{ select: typeof propertyCardSelect }> & {
  offer?: { title: string; discountType: "PERCENT" | "FIXED"; discountValue: number } | null;
};

/** Active offers keyed by property id (best one per property, for card badges). */
async function offersByProperty(propertyIds: string[]) {
  const now = new Date();
  const offers = await db.offer.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
    select: { id: true, title: true, discountType: true, discountValue: true, appliesToAll: true, properties: { select: { propertyId: true } } },
    orderBy: { discountValue: "desc" },
  });
  const map = new Map<string, { title: string; discountType: "PERCENT" | "FIXED"; discountValue: number }>();
  for (const id of propertyIds) {
    const match = offers.find((o) => o.appliesToAll || o.properties.some((p) => p.propertyId === id));
    if (match) map.set(id, { title: match.title, discountType: match.discountType, discountValue: match.discountValue });
  }
  return map;
}

async function withOffers<T extends { id: string }>(rows: T[]) {
  const offers = await offersByProperty(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, offer: offers.get(r.id) ?? null }));
}

function buildWhere(filters: SearchFilters): Prisma.PropertyWhereInput {
  const currency = process.env.DEFAULT_CURRENCY || "KES";
  const and: Prisma.PropertyWhereInput[] = [{ status: "PUBLISHED" }];
  if (filters.destination) and.push({ destination: { slug: filters.destination } });
  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { neighborhood: { contains: q, mode: "insensitive" } },
        { destination: { name: { contains: q, mode: "insensitive" } } },
        { destination: { region: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (filters.guests) and.push({ maxGuests: { gte: filters.guests } });
  if (filters.type.length) and.push({ type: { in: filters.type.filter(isPropertyType) } });
  if (filters.bedrooms) and.push({ bedrooms: { gte: filters.bedrooms } });
  if (filters.bathrooms) and.push({ bathrooms: { gte: filters.bathrooms } });
  if (filters.rating) and.push({ ratingAverage: { gte: filters.rating } });
  if (filters.minPrice !== undefined) and.push({ basePrice: { gte: toMinorUnits(filters.minPrice, currency) } });
  if (filters.maxPrice !== undefined) and.push({ basePrice: { lte: toMinorUnits(filters.maxPrice, currency) } });
  for (const slug of filters.amenities) and.push({ amenities: { some: { amenity: { slug } } } });
  if (filters.offers) {
    const now = new Date();
    const activeOffer = { active: true, startsAt: { lte: now }, endsAt: { gt: now } };
    const anyGlobal = { offers: { some: { offer: activeOffer } } };
    and.push(anyGlobal);
  }
  if (filters.checkIn && filters.checkOut && filters.checkOut > filters.checkIn) {
    const checkIn = parseIsoDate(filters.checkIn);
    const checkOut = parseIsoDate(filters.checkOut);
    and.push({
      bookings: {
        none: {
          status: { in: ACTIVE_BOOKING_STATUSES },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      },
      availabilityBlocks: { none: { startDate: { lt: checkOut }, endDate: { gt: checkIn } } },
    });
  }
  return { AND: and };
}

const PROPERTY_TYPES: PropertyType[] = ["APARTMENT", "STUDIO", "PENTHOUSE", "VILLA", "HOUSE", "COTTAGE", "SUITE", "ROOM"];
function isPropertyType(v: string): v is PropertyType {
  return (PROPERTY_TYPES as string[]).includes(v);
}

function orderBy(sort: SearchFilters["sort"]): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ basePrice: "asc" }, { name: "asc" }];
    case "price_desc":
      return [{ basePrice: "desc" }, { name: "asc" }];
    case "rating":
      return [{ ratingAverage: { sort: "desc", nulls: "last" } }, { reviewCount: "desc" }];
    case "newest":
      return [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    default:
      return [{ featured: "desc" }, { ratingAverage: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  }
}

export async function searchProperties(filters: SearchFilters) {
  // "offers" filter must also include offers that apply to all properties.
  let where = buildWhere(filters);
  if (filters.offers) {
    const now = new Date();
    const global = await db.offer.count({ where: { active: true, appliesToAll: true, startsAt: { lte: now }, endsAt: { gt: now } } });
    if (global > 0) where = buildWhere({ ...filters, offers: false });
  }
  const page = filters.page ?? 1;
  const [total, rows] = await Promise.all([
    db.property.count({ where }),
    db.property.findMany({ where, orderBy: orderBy(filters.sort), select: propertyCardSelect, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), results: await withOffers(rows) };
}

/** Facets for the filter UI — only options that exist in the published inventory. */
export const getSearchFacets = cache(async () => {
  const [types, amenities, destinations, price, maxima] = await Promise.all([
    db.property.groupBy({ by: ["type"], where: { status: "PUBLISHED" }, _count: true }),
    db.amenity.findMany({
      where: { properties: { some: { property: { status: "PUBLISHED" } } } },
      select: { slug: true, name: true, category: true },
      orderBy: { name: "asc" },
    }),
    db.destination.findMany({
      where: { published: true, properties: { some: { status: "PUBLISHED" } } },
      select: { slug: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.property.aggregate({ where: { status: "PUBLISHED" }, _min: { basePrice: true }, _max: { basePrice: true } }),
    db.property.aggregate({ where: { status: "PUBLISHED" }, _max: { bedrooms: true, bathrooms: true, maxGuests: true } }),
  ]);
  return {
    types: types.map((t) => ({ value: t.type, count: t._count })),
    amenities,
    destinations,
    minPrice: price._min.basePrice ?? 0,
    maxPrice: price._max.basePrice ?? 0,
    maxBedrooms: maxima._max.bedrooms ?? 0,
    maxBathrooms: Number(maxima._max.bathrooms ?? 0),
    maxGuests: maxima._max.maxGuests ?? 0,
    currency: process.env.DEFAULT_CURRENCY || "KES",
  };
});

export const getFeaturedProperties = cache(async (take = 6) => {
  const rows = await db.property.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ featured: "desc" }, { ratingAverage: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: propertyCardSelect,
    take,
  });
  return withOffers(rows);
});

export const getPropertyBySlug = cache(async (slug: string) => {
  const property = await db.property.findUnique({
    where: { slug },
    include: {
      destination: true,
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      amenities: { include: { amenity: true }, orderBy: { amenity: { name: "asc" } } },
      rooms: { orderBy: { sortOrder: "asc" } },
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true, authorName: true, rating: true, hostRating: true, amenitiesRating: true, cleanlinessRating: true,
          neighborhoodRating: true, comment: true, createdAt: true, bookingId: true,
        },
      },
    },
  });
  if (!property || property.status !== "PUBLISHED") return null;
  return property;
});

export async function getReviewBreakdown(propertyId: string) {
  const agg = await db.review.aggregate({
    where: { propertyId, status: "PUBLISHED" },
    _avg: { hostRating: true, amenitiesRating: true, cleanlinessRating: true, neighborhoodRating: true },
    _count: true,
  });
  return {
    count: agg._count,
    host: agg._avg.hostRating,
    amenities: agg._avg.amenitiesRating,
    cleanliness: agg._avg.cleanlinessRating,
    neighborhood: agg._avg.neighborhoodRating,
  };
}

export async function getSimilarProperties(property: { id: string; destinationId: string | null; type: PropertyType }, take = 4) {
  const rows = await db.property.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: property.id },
      OR: [{ destinationId: property.destinationId ?? undefined }, { type: property.type }],
    },
    orderBy: [{ featured: "desc" }, { ratingAverage: { sort: "desc", nulls: "last" } }],
    select: propertyCardSelect,
    take,
  });
  return withOffers(rows);
}

export async function getPropertyOffers(propertyId: string) {
  const now = new Date();
  return db.offer.findMany({
    where: { active: true, endsAt: { gt: now }, OR: [{ appliesToAll: true }, { properties: { some: { propertyId } } }] },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true, description: true, discountType: true, discountValue: true, minNights: true, startsAt: true, endsAt: true },
  });
}

// --- Destinations ---------------------------------------------------------------

export const getDestinations = cache(async () => {
  const rows = await db.destination.findMany({
    where: { published: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { properties: { where: { status: "PUBLISHED" } } } },
      properties: {
        where: { status: "PUBLISHED" },
        take: 1,
        orderBy: [{ featured: "desc" }],
        select: { images: { ...coverImage, take: 1 }, basePrice: true, currency: true },
      },
    },
  });
  return rows.map(({ properties, _count, ...d }) => ({
    ...d,
    propertyCount: _count.properties,
    fallbackImage: properties[0]?.images[0] ?? null,
  }));
});

export const getDestinationBySlug = cache(async (slug: string) => {
  const destination = await db.destination.findUnique({ where: { slug } });
  if (!destination || !destination.published) return null;
  const [rows, price] = await Promise.all([
    db.property.findMany({
      where: { status: "PUBLISHED", destinationId: destination.id },
      orderBy: [{ featured: "desc" }, { ratingAverage: { sort: "desc", nulls: "last" } }],
      select: propertyCardSelect,
    }),
    db.property.aggregate({ where: { status: "PUBLISHED", destinationId: destination.id }, _min: { basePrice: true } }),
  ]);
  return { destination, properties: await withOffers(rows), fromPrice: price._min.basePrice };
});

// --- Offers & announcements ------------------------------------------------------

export const getActiveOffers = cache(async () => {
  const now = new Date();
  return db.offer.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: [{ showBanner: "desc" }, { endsAt: "asc" }],
    include: { properties: { select: { property: { select: { name: true, slug: true, status: true } } } } },
  });
});

export const getLiveAnnouncements = cache(async (take = 10) => {
  const now = new Date();
  return db.announcement.findMany({
    where: { status: "PUBLISHED", publishAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { publishAt: "desc" },
    take,
  });
});

export async function getAnnouncementBySlug(slug: string) {
  const now = new Date();
  const a = await db.announcement.findUnique({ where: { slug } });
  if (!a || a.status !== "PUBLISHED" || a.publishAt > now) return null;
  return a;
}

export async function getPublishedReviewsHighlights(take = 6) {
  return db.review.findMany({
    where: { status: "PUBLISHED", bookingId: { not: null }, comment: { not: null }, rating: { gte: 4 } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, authorName: true, rating: true, comment: true, createdAt: true, property: { select: { name: true, slug: true } } },
  });
}
