import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getLiveAnnouncements } from "@/server/services/catalog";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { EmptyState } from "@/components/ui/feedback";
import { ResponsiveImage } from "@/components/ui/image";

export const metadata = pageMetadata({ title: "News & updates", description: "New stays, price updates and service news from Queensy BnB.", path: "/announcements" });

export default async function AnnouncementsPage() {
  const items = await getLiveAnnouncements(50);
  return (
    <div className="container-page max-w-4xl pb-8 pt-8 sm:pt-12">
      <h1 className="text-h1 font-bold">News & updates</h1>
      {items.length === 0 ? (
        <EmptyState className="mt-10" icon={<Megaphone />} title="No updates yet" description="New stays, price changes and service news will appear here." />
      ) : (
        <ul className="mt-10 space-y-6">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/announcements/${a.slug}`} className="group grid gap-5 rounded-2xl bg-surface p-4 ring-1 ring-ink-200/70 transition hover:shadow-card sm:grid-cols-[220px_1fr]">
                <ResponsiveImage image={a.imageUrl ? { url: a.imageUrl } : null} alt="" sizes="220px" className="aspect-[16/10] w-full rounded-xl" fallbackLabel="Queensy update" />
                <div className="py-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-lagoon-700">{formatDate(a.publishAt)}</p>
                  <h2 className="mt-1 font-sans text-lg font-semibold group-hover:underline">{a.title}</h2>
                  <p className="mt-1 line-clamp-3 text-ink-600">{a.body}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
