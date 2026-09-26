import Link from "next/link";
import { Tag } from "lucide-react";
import { getActiveOffers } from "@/server/services/catalog";
import { formatDate, formatMoney } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { ResponsiveImage } from "@/components/ui/image";

export const metadata = pageMetadata({ title: "Offers & deals on stays in Kenya", description: "Current discounts and seasonal offers on Queensy BnB stays. Discounts apply automatically when you book.", path: "/offers" });

export default async function OffersPage() {
  const offers = await getActiveOffers();
  const currency = process.env.DEFAULT_CURRENCY || "KES";
  return (
    <div className="container-page pb-8 pt-8 sm:pt-12">
      <h1 className="text-h1 font-bold">Offers</h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-600">Discounts are applied automatically at checkout when your dates qualify — no codes needed.</p>
      {offers.length === 0 ? (
        <EmptyState className="mt-10" icon={<Tag />} title="No offers running right now" description="Subscribe at the bottom of the page to hear about the next one first." action={<ButtonLink href="/properties" variant="primary">Browse stays</ButtonLink>} />
      ) : (
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {offers.map((o) => {
            const props = o.properties.map((p) => p.property).filter((p) => p.status === "PUBLISHED");
            return (
              <li key={o.id} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-ink-200/70">
                {o.imageUrl && <ResponsiveImage image={{ url: o.imageUrl }} alt="" sizes="(min-width:768px) 50vw, 100vw" className="aspect-[16/7] w-full" />}
                <div className="p-6">
                  <p className="text-sm font-semibold text-sunset-700">
                    {o.discountType === "PERCENT" ? `${o.discountValue}% off` : `${formatMoney(o.discountValue, currency)} off`}
                    {o.minNights > 1 ? ` · stays of ${o.minNights}+ nights` : ""}
                  </p>
                  <h2 className="mt-1 text-h3 font-semibold">{o.title}</h2>
                  {o.description && <p className="mt-2 text-ink-700">{o.description}</p>}
                  <p className="mt-3 text-sm text-ink-600">For check-ins from {formatDate(o.startsAt)} to {formatDate(o.endsAt)}.</p>
                  <p className="mt-3 text-sm">
                    {o.appliesToAll ? (
                      <Link href="/properties" className="font-semibold underline underline-offset-4">Valid on all stays</Link>
                    ) : (
                      <>
                        Valid at:{" "}
                        {props.map((p, i) => (
                          <span key={p.slug}>
                            {i > 0 && ", "}
                            <Link href={`/properties/${p.slug}`} className="font-semibold underline underline-offset-4">{p.name}</Link>
                          </span>
                        ))}
                      </>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
