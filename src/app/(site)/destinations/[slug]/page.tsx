import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Home } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getDestinationBySlug } from "@/server/services/catalog";
import { favoriteIds } from "@/server/services/favorites";
import { formatMoney } from "@/lib/format";
import { absoluteUrl, breadcrumbJsonLd, JsonLd, pageMetadata } from "@/lib/seo";
import { PropertyCard } from "@/components/property/property-card";
import { ResponsiveImage } from "@/components/ui/image";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getDestinationBySlug((await params).slug);
  if (!data) return { title: "Destination not found", robots: { index: false } };
  const { destination: d, properties, fromPrice } = data;
  return pageMetadata({
    title: `Stays in ${d.name}, Kenya — apartments & holiday homes`,
    description: `${d.summary ?? `Find a place to stay in ${d.name}.`} ${properties.length} stay${properties.length === 1 ? "" : "s"}${fromPrice ? ` from ${formatMoney(fromPrice, properties[0]?.currency ?? "KES")} per night` : ""}.`.slice(0, 300),
    path: `/destinations/${d.slug}`,
    image: d.imageUrl ?? properties[0]?.images[0]?.url,
  });
}

export default async function DestinationPage({ params }: Props) {
  const data = await getDestinationBySlug((await params).slug);
  if (!data) notFound();
  const { destination: d, properties, fromPrice } = data;
  const user = await getCurrentUser();
  const favs = await favoriteIds(user?.id);
  const hero = d.imageUrl ? { url: d.imageUrl } : (properties[0]?.images[0] ?? null);

  return (
    <div>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "TouristDestination",
            name: d.name,
            description: d.summary ?? undefined,
            url: absoluteUrl(`/destinations/${d.slug}`),
            containedInPlace: { "@type": "Country", name: "Kenya" },
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: properties.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/properties/${p.slug}`), name: p.name })),
          },
          breadcrumbJsonLd([{ name: "Destinations", path: "/destinations" }, { name: d.name, path: `/destinations/${d.slug}` }]),
        ]}
      />
      <section className="relative isolate overflow-hidden bg-lagoon-950">
        {hero && (
          <>
            <ResponsiveImage image={hero} alt="" priority sizes="100vw" className="absolute inset-0 -z-10 h-full w-full" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/80 via-ink-950/40 to-ink-950/20" aria-hidden />
          </>
        )}
        <div className="container-page py-16 sm:py-24">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <Link href="/destinations" className="hover:text-white hover:underline">Destinations</Link> / <span className="text-white">{d.name}</span>
          </nav>
          <h1 className="mt-3 text-display font-bold text-white">Stays in {d.name}</h1>
          {d.summary && <p className="mt-4 max-w-2xl text-lg text-white/85">{d.summary}</p>}
          <p className="mt-6 text-sm font-medium text-white/80">
            {d.region ? `${d.region}, ` : ""}Kenya · {properties.length} stay{properties.length === 1 ? "" : "s"}
            {fromPrice ? ` · from ${formatMoney(fromPrice, properties[0]?.currency ?? "KES")} / night` : ""}
          </p>
        </div>
      </section>

      <div className="container-page pt-12">
        <h2 className="text-h2 font-bold">Where to stay in {d.name}</h2>
        {properties.length > 0 ? (
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p, i) => (
              <PropertyCard key={p.id} property={p} favorited={favs.has(p.id)} signedIn={Boolean(user)} priority={i < 3} />
            ))}
          </div>
        ) : (
          <EmptyState className="mt-6" icon={<Home />} title={`No stays in ${d.name} yet`} description="We're adding homes here. Tell us your dates and we'll let you know what's available." action={<ButtonLink href="/contact" variant="brand">Contact us</ButtonLink>} />
        )}

        {d.description && (
          <section className="mt-16 max-w-3xl" aria-labelledby="guide-heading">
            <h2 id="guide-heading" className="text-h2 font-bold">About {d.name}</h2>
            <div className="mt-4 space-y-4 text-lg leading-relaxed text-ink-800">
              {d.description.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
