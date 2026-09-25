import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAnnouncementBySlug } from "@/server/services/catalog";
import { formatDate } from "@/lib/format";
import { absoluteUrl, JsonLd, pageMetadata } from "@/lib/seo";
import { ResponsiveImage } from "@/components/ui/image";
import { ButtonLink } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getAnnouncementBySlug((await params).slug);
  if (!a) return { title: "Not found", robots: { index: false } };
  return pageMetadata({ title: a.title, description: a.body.slice(0, 160), path: `/announcements/${a.slug}`, image: a.imageUrl });
}

export default async function AnnouncementPage({ params }: Props) {
  const a = await getAnnouncementBySlug((await params).slug);
  if (!a) notFound();
  const expired = a.expiresAt && a.expiresAt < new Date();
  return (
    <article className="container-page max-w-3xl pb-8 pt-8 sm:pt-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title, datePublished: a.publishAt.toISOString(), dateModified: a.updatedAt.toISOString(), image: a.imageUrl ? [absoluteUrl(a.imageUrl)] : undefined, publisher: { "@type": "Organization", name: "Queensy BnB" } }} />
      <Link href="/announcements" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-700 hover:text-ink-950"><ChevronLeft className="size-4" /> All updates</Link>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-lagoon-700">{formatDate(a.publishAt, { day: "numeric", month: "long", year: "numeric" })}</p>
      <h1 className="mt-2 text-h1 font-bold">{a.title}</h1>
      {expired && <p className="mt-3 text-sm text-ink-500">This update has ended.</p>}
      {a.imageUrl && <ResponsiveImage image={{ url: a.imageUrl }} alt="" priority sizes="(min-width: 768px) 768px, 100vw" className="mt-8 aspect-[16/9] w-full rounded-2xl" />}
      <div className="mt-8 space-y-4 text-lg leading-relaxed text-ink-800">
        {a.body.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
      </div>
      {a.ctaUrl && !expired && <ButtonLink href={a.ctaUrl} variant="primary" size="lg" className="mt-8">{a.ctaLabel || "Learn more"}</ButtonLink>}
    </article>
  );
}
