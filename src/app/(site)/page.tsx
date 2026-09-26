import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, CalendarCheck2, MessagesSquare, Receipt, Star } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import {
  getActiveOffers,
  getDestinations,
  getFeaturedProperties,
  getLiveAnnouncements,
  getPublishedReviewsHighlights,
} from "@/server/services/catalog";
import { favoriteIds } from "@/server/services/favorites";
import { getSettings } from "@/server/services/settings";
import { today } from "@/server/services/availability";
import { toIsoDate } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { SearchBar } from "@/components/search/search-bar";
import { PropertyCard } from "@/components/property/property-card";
import { ResponsiveImage } from "@/components/ui/image";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { MOMBASA_HERO } from "@/lib/hero-photo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [user, settings, destinations, featured, offers, reviews, announcements] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    getDestinations(),
    getFeaturedProperties(6),
    getActiveOffers(),
    getPublishedReviewsHighlights(3),
    getLiveAnnouncements(3),
  ]);
  const favs = await favoriteIds(user?.id);
  const liveDestinations = destinations.filter((d) => d.propertyCount > 0 || d.featured);
  const heroImage = settings.heroImageUrl ? { url: settings.heroImageUrl, alt: "" } : (featured.find((p) => p.images[0])?.images[0] ?? null);

  return (
    <>
      <JsonLd data={[organizationJsonLd(settings), websiteJsonLd(settings)]} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-lagoon-950">
        {/* Phones and tablets: the hero image from Settings, or a featured stay's photo. */}
        {heroImage && <ResponsiveImage image={heroImage} alt="" priority sizes="100vw" className="absolute inset-0 -z-10 h-full w-full lg:hidden" />}
        {/* Desktop: the Settings hero image if one is set, otherwise Mombasa, slightly dulled. */}
        {settings.heroImageUrl ? (
          <ResponsiveImage image={{ url: settings.heroImageUrl, alt: "" }} alt="" priority sizes="100vw" className="absolute inset-0 -z-10 hidden h-full w-full lg:block" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={MOMBASA_HERO.src}
            srcSet={MOMBASA_HERO.srcSet}
            sizes="100vw"
            width={MOMBASA_HERO.width}
            height={MOMBASA_HERO.height}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 -z-10 hidden h-full w-full object-cover brightness-[.8] saturate-[.7] lg:block"
          />
        )}
        {(heroImage || !settings.heroImageUrl) && (
          <div className={`absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/55 via-ink-950/35 to-ink-950/70${heroImage ? "" : " hidden lg:block"}`} aria-hidden />
        )}
        {!settings.heroImageUrl && (
          <a href={MOMBASA_HERO.credit.href} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-3 hidden text-[11px] text-white/60 hover:text-white/90 lg:block">
            {MOMBASA_HERO.credit.text}
          </a>
        )}
        <div className="container-page pb-10 pt-16 sm:pb-16 sm:pt-24 lg:pb-24 lg:pt-32">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90 ring-1 ring-white/15 backdrop-blur">
              <BadgeCheck className="size-4 text-sunset-300" aria-hidden /> Real-time availability · Instant booking requests
            </p>
            <h1 className="text-display font-bold text-white">{settings.heroTitle}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">{settings.heroSubtitle}</p>
          </div>
          <div className="mt-8 max-w-4xl sm:mt-10">
            <SearchBar destinations={liveDestinations.map((d) => ({ slug: d.slug, name: d.name }))} today={toIsoDate(today())} />
          </div>
        </div>
      </section>

      {/* Featured destinations */}
      {liveDestinations.length > 0 && (
        <section className="container-page pt-16 sm:pt-20" aria-labelledby="destinations-heading">
          <SectionHeading id="destinations-heading" eyebrow="Where to next" title="Explore our destinations" href="/destinations" linkLabel="All destinations" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {liveDestinations.slice(0, 8).map((d, i) => {
              const image = d.imageUrl ? { url: d.imageUrl, alt: "" } : d.fallbackImage;
              return (
                <Reveal key={d.id} delay={i * 0.04}>
                  <Link href={`/destinations/${d.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-lagoon-900">
                    {image ? (
                      <>
                        <ResponsiveImage image={image} alt="" sizes="(min-width:1024px) 25vw, 50vw" className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent" aria-hidden />
                      </>
                    ) : (
                      <div className="flex h-full items-start justify-end bg-lagoon-800 p-4 transition-colors group-hover:bg-lagoon-700" aria-hidden>
                        <MapPin className="size-6 text-lagoon-300" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <h3 className="font-display text-lg font-semibold text-white sm:text-xl">{d.name}</h3>
                      <p className="text-sm text-white/80">
                        {d.propertyCount > 0 ? `${d.propertyCount} stay${d.propertyCount === 1 ? "" : "s"}` : "Coming soon"}
                        {d.region ? ` · ${d.region}` : ""}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured stays */}
      <section className="container-page pt-16 sm:pt-20" aria-labelledby="featured-heading">
        <SectionHeading id="featured-heading" eyebrow="Handpicked" title="Stays guests love" href="/properties" linkLabel="View all stays" />
        {featured.length > 0 ? (
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.05}>
                <PropertyCard property={p} favorited={favs.has(p.id)} signedIn={Boolean(user)} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-ink-600">New stays are being added. Check back soon or <Link className="font-semibold underline" href="/contact">get in touch</Link>.</p>
        )}
      </section>

      {/* Offers */}
      {offers.length > 0 && (
        <section className="container-page pt-16 sm:pt-20" aria-labelledby="offers-heading">
          <SectionHeading id="offers-heading" eyebrow="Limited time" title="Current offers" href="/offers" linkLabel="All offers" />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {offers.slice(0, 2).map((o) => (
              <Link key={o.id} href="/offers" className="group flex flex-col justify-between gap-6 rounded-2xl bg-sunset-50 p-6 ring-1 ring-sunset-100 transition hover:ring-sunset-200 sm:p-8">
                <div>
                  <p className="text-sm font-semibold text-sunset-700">
                    {o.discountType === "PERCENT" ? `${o.discountValue}% off` : `${formatMoney(o.discountValue, process.env.DEFAULT_CURRENCY || "KES")} off`}
                    {o.minNights > 1 ? ` · ${o.minNights}+ nights` : ""}
                  </p>
                  <h3 className="mt-2 text-h3 font-semibold">{o.title}</h3>
                  {o.description && <p className="mt-2 line-clamp-2 text-ink-700">{o.description}</p>}
                </div>
                <p className="flex items-center justify-between text-sm text-ink-600">
                  <span>For stays starting by {formatDate(o.endsAt)}</span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Why Queensy */}
      <section className="container-page pt-16 sm:pt-24" aria-labelledby="why-heading">
        <div className="rounded-3xl bg-surface px-5 py-10 ring-1 ring-ink-200/70 sm:px-10 sm:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-lagoon-700">Why book with Queensy</p>
            <h2 id="why-heading" className="mt-2 text-h2 font-bold">Booking should feel as easy as the stay itself</h2>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CalendarCheck2, title: "Live availability", body: "The calendar you see is the calendar we use. Dates are held for you the moment you request them." },
              { icon: Receipt, title: "Clear pricing", body: "Nightly rate, fees and any discount are itemised before you book. No surprises at check-in." },
              { icon: MessagesSquare, title: "A team that answers", body: "Message our Kenya-based team from your account and get replies in real time." },
              { icon: BadgeCheck, title: "Your data, respected", body: "We only send marketing if you opt in, and you can change your mind any time." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <span className="grid size-11 place-items-center rounded-xl bg-lagoon-50 text-lagoon-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-sans text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified reviews */}
      {reviews.length > 0 && (
        <section className="container-page pt-16 sm:pt-20" aria-labelledby="reviews-heading">
          <SectionHeading id="reviews-heading" eyebrow="Verified stays" title="What guests say" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="flex flex-col justify-between rounded-2xl bg-surface p-6 ring-1 ring-ink-200/70">
                <div>
                  <div className="flex gap-0.5" aria-label={`${Number(r.rating).toFixed(1)} out of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={i < Math.round(Number(r.rating)) ? "size-4 fill-gold-400 text-gold-400" : "size-4 text-ink-200"} aria-hidden />
                    ))}
                  </div>
                  <blockquote className="mt-4 line-clamp-5 leading-relaxed text-ink-800">“{r.comment}”</blockquote>
                </div>
                <figcaption className="mt-5 text-sm text-ink-600">
                  <span className="font-semibold text-ink-900">{r.authorName}</span> stayed at{" "}
                  <Link href={`/properties/${r.property.slug}`} className="underline underline-offset-2">{r.property.name}</Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="container-page pt-16 sm:pt-20" aria-labelledby="news-heading">
          <SectionHeading id="news-heading" eyebrow="News" title="Latest from Queensy" href="/announcements" linkLabel="All updates" />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {announcements.map((a) => (
              <Link key={a.id} href={`/announcements/${a.slug}`} className="group overflow-hidden rounded-2xl bg-surface ring-1 ring-ink-200/70 transition hover:shadow-card">
                {a.imageUrl && <ResponsiveImage image={{ url: a.imageUrl }} alt="" sizes="(min-width:768px) 33vw, 100vw" className="aspect-[16/9] w-full" />}
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-lagoon-700">{formatDate(a.publishAt)}</p>
                  <h3 className="mt-2 font-sans text-base font-semibold group-hover:underline">{a.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-600">{a.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-page pt-16 sm:pt-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-ink-950 px-6 py-10 text-white sm:px-10 sm:py-12 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="text-h2 font-bold text-white">Planning a long stay, a family trip or a work visit?</h2>
            <p className="mt-3 text-white/75">Tell us what you need. We&apos;ll suggest the right place and help with arrival, transfers and anything else.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/contact" variant="primary" size="lg">Talk to our team</ButtonLink>
            <ButtonLink href="/properties" size="lg" className="bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15">Browse stays</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ id, eyebrow, title, href, linkLabel }: { id: string; eyebrow: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-lagoon-700">{eyebrow}</p>
        <h2 id={id} className="mt-1.5 text-h2 font-bold">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-ink-900 underline-offset-4 hover:underline sm:inline-flex">
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
