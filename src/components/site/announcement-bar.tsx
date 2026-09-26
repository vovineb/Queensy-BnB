import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getActiveOffers, getLiveAnnouncements } from "@/server/services/catalog";

/** Slim, admin-controlled strip: the newest banner offer, else the newest announcement. */
export async function AnnouncementBar() {
  const [offers, announcements] = await Promise.all([getActiveOffers(), getLiveAnnouncements(1)]);
  const offer = offers.find((o) => o.showBanner);
  const item = offer
    ? { text: offer.promoCopy || offer.title, href: "/offers", cta: "See offer" }
    : announcements[0]
      ? { text: announcements[0].title, href: announcements[0].ctaUrl || `/announcements/${announcements[0].slug}`, cta: announcements[0].ctaLabel || "Read more" }
      : null;
  if (!item) return null;
  return (
    <div className="bg-lagoon-900 text-lagoon-50">
      <div className="container-page flex min-h-10 items-center justify-center gap-3 py-2 text-center text-sm">
        <span className="line-clamp-2">{item.text}</span>
        <Link href={item.href} className="inline-flex shrink-0 items-center gap-1 font-semibold text-white underline-offset-4 hover:underline">
          {item.cta} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
