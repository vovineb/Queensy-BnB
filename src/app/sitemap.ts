import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const [properties, destinations, announcements] = await Promise.all([
    db.property.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true, images: { take: 3, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], select: { url: true } } } }),
    db.destination.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.announcement.findMany({ where: { status: "PUBLISHED", publishAt: { lte: now } }, select: { slug: true, updatedAt: true } }),
  ]);
  const abs = (u: string) => (u.startsWith("http") ? u : `${base}${u}`);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/properties`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/destinations`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/offers`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/announcements`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...destinations.map((d) => ({ url: `${base}/destinations/${d.slug}`, lastModified: d.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...properties.map((p) => ({ url: `${base}/properties/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.9, images: p.images.map((i) => abs(i.url)) })),
    ...announcements.map((a) => ({ url: `${base}/announcements/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
