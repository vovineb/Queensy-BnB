import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, BedDouble, Clock, DoorOpen, MapPin, MessageCircle, ShieldCheck, Tag, Users } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getPropertyBySlug, getPropertyOffers, getReviewBreakdown, getSimilarProperties } from "@/server/services/catalog";
import { favoriteIds } from "@/server/services/favorites";
import { getSettings } from "@/server/services/settings";
import { today } from "@/server/services/availability";
import { searchParamsSchema } from "@/lib/validation";
import { toIsoDate } from "@/lib/dates";
import { formatDate, formatMoney, pluralize } from "@/lib/format";
import { CANCELLATION_POLICY_COPY, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { absoluteUrl, breadcrumbJsonLd, JsonLd, pageMetadata } from "@/lib/seo";
import { PropertyGallery } from "@/components/property/gallery";
import { AmenityList } from "@/components/property/amenity-list";
import { FavoriteButton } from "@/components/property/favorite-button";
import { ShareButton } from "@/components/property/share-button";
import { PropertyCard } from "@/components/property/property-card";
import { PropertyViewTracker } from "@/components/property/view-tracker";
import { BookingWidget } from "@/components/booking/booking-widget";
import { RatingBar, RatingInline } from "@/components/ui/rating";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: "Stay not found", robots: { index: false } };
  const where = [property.neighborhood, property.destination?.name, "Kenya"].filter(Boolean).join(", ");
  return pageMetadata({
    title: `${property.name} — ${PROPERTY_TYPE_LABELS[property.type]} in ${property.destination?.name ?? "Kenya"}`,
    description: `${property.summary} ${pluralize(property.bedrooms, "bedroom")}, sleeps ${property.maxGuests}, in ${where}. From ${formatMoney(property.basePrice, property.currency)} per night. Check live availability and book online.`.slice(0, 300),
    path: `/properties/${property.slug}`,
    image: property.images[0]?.url,
  });
}

export default async function PropertyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();
  const sp = searchParamsSchema.parse(await searchParams);
  const [user, settings, offers, breakdown, similar] = await Promise.all([
    getCurrentUser(),
    getSettings(),
    getPropertyOffers(property.id),
    getReviewBreakdown(property.id),
    getSimilarProperties(property),
  ]);
  const favs = await favoriteIds(user?.id);
  const location = [property.neighborhood, property.destination?.name, property.destination?.region].filter(Boolean).join(", ");
  const policy = CANCELLATION_POLICY_COPY[property.cancellationPolicy];
  const hasMap = property.latitude !== null && property.longitude !== null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.name,
    description: property.description,
    url: absoluteUrl(`/properties/${property.slug}`),
    image: property.images.slice(0, 8).map((i) => absoluteUrl(i.url)),
    identifier: property.id,
    address: { "@type": "PostalAddress", addressLocality: property.destination?.name, addressRegion: property.destination?.region ?? undefined, addressCountry: property.destination?.country ?? "KE" },
    ...(hasMap ? { geo: { "@type": "GeoCoordinates", latitude: Number(property.latitude), longitude: Number(property.longitude) } } : {}),
    containsPlace: {
      "@type": "Accommodation",
      additionalType: PROPERTY_TYPE_LABELS[property.type],
      numberOfBedrooms: property.bedrooms,
      numberOfBathroomsTotal: Number(property.bathrooms),
      occupancy: { "@type": "QuantitativeValue", maxValue: property.maxGuests },
      amenityFeature: property.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a.amenity.name, value: true })),
    },
    checkinTime: property.checkInTime,
    checkoutTime: property.checkOutTime,
    // Only real, published reviews feed the rating.
    ...(property.reviewCount > 0 && property.ratingAverage
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(property.ratingAverage), reviewCount: property.reviewCount, bestRating: 5 } }
      : {}),
  };

  return (
    <article className="pb-28 lg:pb-10">
      <JsonLd
        data={[
          jsonLd,
          breadcrumbJsonLd([
            { name: "Stays", path: "/properties" },
            ...(property.destination ? [{ name: property.destination.name, path: `/destinations/${property.destination.slug}` }] : []),
            { name: property.name, path: `/properties/${property.slug}` },
          ]),
        ]}
      />
      <PropertyViewTracker propertyId={property.id} />

      <div className="container-page pt-4 sm:pt-6">
        <nav aria-label="Breadcrumb" className="mb-4 hidden text-sm text-ink-500 sm:block">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/properties" className="hover:text-ink-900 hover:underline">Stays</Link></li>
            {property.destination && (
              <>
                <li aria-hidden>/</li>
                <li><Link href={`/destinations/${property.destination.slug}`} className="hover:text-ink-900 hover:underline">{property.destination.name}</Link></li>
              </>
            )}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink-800">{property.name}</li>
          </ol>
        </nav>

        <PropertyGallery images={property.images} name={property.name} propertyId={property.id} />

        <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-h1 font-bold">{property.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-700">
              <RatingInline value={property.ratingAverage?.toString()} count={property.reviewCount} size="md" />
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden /> {location}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-1">
            <ShareButton title={property.name} />
            <FavoriteButton propertyId={property.id} initial={favs.has(property.id)} signedIn={Boolean(user)} variant="inline" />
          </div>
        </div>

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div className="min-w-0 space-y-10">
            <section aria-label="Overview" className="flex flex-wrap gap-x-6 gap-y-3 border-b border-ink-200 pb-8 text-ink-800">
              <Fact icon={<DoorOpen />} label={PROPERTY_TYPE_LABELS[property.type]} />
              <Fact icon={<Users />} label={`Up to ${pluralize(property.maxGuests, "guest")}`} />
              <Fact icon={<BedDouble />} label={`${pluralize(property.bedrooms, "bedroom")} · ${pluralize(property.beds, "bed")}`} />
              <Fact icon={<Bath />} label={pluralize(Number(property.bathrooms), "bathroom")} />
            </section>

            {offers.length > 0 && (
              <section aria-label="Offers" className="space-y-3">
                {offers.map((o) => (
                  <div key={o.id} className="flex items-start gap-3 rounded-xl bg-sunset-50 p-4 ring-1 ring-sunset-100">
                    <Tag className="mt-0.5 size-5 shrink-0 text-sunset-600" aria-hidden />
                    <div>
                      <p className="font-semibold text-ink-950">
                        {o.title} — {o.discountType === "PERCENT" ? `${o.discountValue}% off` : `${formatMoney(o.discountValue, property.currency)} off`}
                      </p>
                      <p className="text-sm text-ink-700">
                        {o.description ? `${o.description} ` : ""}For check-ins {formatDate(o.startsAt)} – {formatDate(o.endsAt)}
                        {o.minNights > 1 ? `, stays of ${o.minNights}+ nights` : ""}. Applied automatically at checkout.
                      </p>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-h3 font-semibold">About this place</h2>
              <div className="mt-3 space-y-4 leading-relaxed text-ink-800">
                {property.description.split(/\n{2,}/).map((p, i) => (
                  <p key={i} className="whitespace-pre-line">{p}</p>
                ))}
              </div>
            </section>

            {property.rooms.length > 0 && (
              <section aria-labelledby="rooms-heading">
                <h2 id="rooms-heading" className="text-h3 font-semibold">Where you&apos;ll sleep</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {property.rooms.map((r) => (
                    <li key={r.id} className="rounded-xl p-4 ring-1 ring-ink-200">
                      <BedDouble className="size-6 text-ink-700" aria-hidden />
                      <p className="mt-3 font-semibold">{r.name}</p>
                      <p className="text-sm text-ink-600">{r.beds}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {property.amenities.length > 0 && (
              <section aria-labelledby="amenities-heading">
                <h2 id="amenities-heading" className="text-h3 font-semibold">What this place offers</h2>
                <AmenityList amenities={property.amenities.map((a) => a.amenity)} />
              </section>
            )}

            <section aria-labelledby="reviews-heading" className="border-t border-ink-200 pt-10">
              <h2 id="reviews-heading" className="flex items-center gap-3 text-h3 font-semibold">
                {property.reviewCount > 0 ? (
                  <>
                    <RatingInline value={property.ratingAverage?.toString()} count={property.reviewCount} size="md" />
                  </>
                ) : (
                  "Reviews"
                )}
              </h2>
              {breakdown.count > 0 ? (
                <>
                  <div className="mt-5 grid gap-x-12 gap-y-3 sm:grid-cols-2">
                    <RatingBar label="Host" value={breakdown.host} />
                    <RatingBar label="Cleanliness" value={breakdown.cleanliness} />
                    <RatingBar label="Amenities" value={breakdown.amenities} />
                    <RatingBar label="Neighbourhood" value={breakdown.neighborhood} />
                  </div>
                  <ul className="mt-8 grid gap-8 sm:grid-cols-2">
                    {property.reviews.map((r) => (
                      <li key={r.id}>
                        <p className="font-semibold">{r.authorName}</p>
                        <p className="text-sm text-ink-500">
                          {formatDate(r.createdAt, { month: "long", year: "numeric" })}
                          {r.bookingId && " · Verified stay"}
                        </p>
                        {r.comment && <p className="mt-2 leading-relaxed text-ink-800">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-3 text-ink-600">No reviews yet. Guests who stay here can review it after checkout.</p>
              )}
            </section>

            <section aria-labelledby="location-heading" className="border-t border-ink-200 pt-10">
              <h2 id="location-heading" className="text-h3 font-semibold">Where you&apos;ll be</h2>
              <p className="mt-2 text-ink-700">{location || "Kenya"}. The exact address is shared after your booking is confirmed.</p>
              {hasMap && (
                <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-ink-200">
                  <iframe
                    title={`Map of the area around ${property.name}`}
                    loading="lazy"
                    className="aspect-[16/9] w-full"
                    referrerPolicy="no-referrer"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(property.longitude) - 0.02}%2C${Number(property.latitude) - 0.015}%2C${Number(property.longitude) + 0.02}%2C${Number(property.latitude) + 0.015}&layer=mapnik`}
                  />
                </div>
              )}
              {property.destination && (
                <Link href={`/destinations/${property.destination.slug}`} className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
                  About {property.destination.name}
                </Link>
              )}
            </section>

            <section aria-labelledby="rules-heading" className="grid gap-8 border-t border-ink-200 pt-10 sm:grid-cols-2">
              <div>
                <h2 id="rules-heading" className="font-sans text-base font-semibold">House rules</h2>
                <ul className="mt-3 space-y-2 text-ink-700">
                  <li className="flex items-center gap-2"><Clock className="size-4" aria-hidden /> Check-in after {property.checkInTime}</li>
                  <li className="flex items-center gap-2"><Clock className="size-4" aria-hidden /> Check-out before {property.checkOutTime}</li>
                  <li className="flex items-center gap-2"><Users className="size-4" aria-hidden /> Maximum {property.maxGuests} guests</li>
                  {property.minNights > 1 && <li className="flex items-center gap-2"><DoorOpen className="size-4" aria-hidden /> Minimum stay {property.minNights} nights</li>}
                </ul>
                {property.houseRules && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">{property.houseRules}</p>}
              </div>
              <div>
                <h2 className="font-sans text-base font-semibold">Cancellation policy</h2>
                <p className="mt-3 flex items-start gap-2 text-ink-700">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    <Badge tone="brand" className="mr-1">{policy.label}</Badge> {policy.summary}
                  </span>
                </p>
                {property.cancellationNotes && <p className="mt-2 text-sm text-ink-600">{property.cancellationNotes}</p>}
              </div>
            </section>

            <section aria-labelledby="host-heading" className="flex flex-col gap-4 rounded-2xl bg-lagoon-50 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="host-heading" className="font-sans text-base font-semibold">Hosted by the {settings.siteName} team</h2>
                <p className="mt-1 text-sm text-ink-700">Local, Kenya-based hosts. {settings.supportHours}.</p>
              </div>
              <ButtonLink href={user ? `/account/messages/new?propertyId=${property.id}` : `/contact?property=${property.slug}`} variant="secondary" icon={<MessageCircle className="size-4" />}>
                Ask a question
              </ButtonLink>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Book this stay">
            <BookingWidget
              property={{ id: property.id, slug: property.slug, basePrice: property.basePrice, currency: property.currency, maxGuests: property.maxGuests, minNights: property.minNights, maxNights: property.maxNights }}
              initial={{ checkIn: sp.checkIn, checkOut: sp.checkOut, guests: sp.guests }}
              today={toIsoDate(today())}
            />
          </aside>
        </div>

        {similar.length > 0 && (
          <section aria-labelledby="similar-heading" className="mt-16 border-t border-ink-200 pt-12">
            <h2 id="similar-heading" className="text-h2 font-bold">You might also like</h2>
            <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((p) => (
                <PropertyCard key={p.id} property={p} favorited={favs.has(p.id)} signedIn={Boolean(user)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 [&_svg]:size-5 [&_svg]:text-ink-600">
      {icon}
      <span className="font-medium">{label}</span>
    </span>
  );
}
