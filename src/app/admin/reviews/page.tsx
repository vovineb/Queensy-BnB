import Link from "next/link";
import { Star } from "lucide-react";
import { db } from "@/server/db";
import { formatDate } from "@/lib/format";
import { setReviewStatusAction } from "@/server/actions/admin/people";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { FilterBar, filterInput, PageHeader } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/inline-actions";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "all" } = await searchParams;
  const reviews = await db.review.findMany({
    where: status === "HIDDEN" || status === "PUBLISHED" ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { property: { select: { name: true, slug: true } }, booking: { select: { reference: true, id: true } } },
  });
  return (
    <>
      <PageHeader title="Reviews" description="Reviews from verified stays are published automatically. Imported reviews from the old site start hidden — publish the ones you trust." />
      <FilterBar action="/admin/reviews">
        <select name="status" defaultValue={status} className={filterInput} aria-label="Status"><option value="all">All</option><option value="PUBLISHED">Published</option><option value="HIDDEN">Hidden</option></select>
      </FilterBar>
      {reviews.length === 0 ? <EmptyState icon={<Star />} title="No reviews yet" description="Guests can review a stay after checkout." /> : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl bg-surface p-5 ring-1 ring-ink-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="inline-flex items-center gap-1"><Star className="size-4 fill-gold-400 text-gold-400" /> {Number(r.rating).toFixed(1)}</span>
                    {r.authorName} · <Link href={`/properties/${r.property.slug}`} className="hover:underline">{r.property.name}</Link>
                    <Badge tone={r.status === "PUBLISHED" ? "success" : "neutral"}>{r.status === "PUBLISHED" ? "Published" : "Hidden"}</Badge>
                    {r.booking ? <Badge tone="brand">Verified stay</Badge> : <Badge tone="warning">Unverified (legacy)</Badge>}
                  </p>
                  <p className="text-xs text-ink-500">
                    {formatDate(r.createdAt)} · Host {r.hostRating} · Cleanliness {r.cleanlinessRating} · Amenities {r.amenitiesRating} · Neighbourhood {r.neighborhoodRating}
                    {r.booking && <> · <Link href={`/admin/bookings/${r.booking.id}`} className="underline">{r.booking.reference}</Link></>}
                  </p>
                </div>
                {r.status === "PUBLISHED" ? (
                  <ActionButton onClick={setReviewStatusAction.bind(null, r.id, "HIDDEN")}>Hide</ActionButton>
                ) : (
                  <ActionButton tone="brand" onClick={setReviewStatusAction.bind(null, r.id, "PUBLISHED")}>Publish</ActionButton>
                )}
              </div>
              {r.comment && <p className="mt-3 text-sm leading-relaxed text-ink-800">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
