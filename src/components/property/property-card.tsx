import Link from "next/link";
import { MapPin } from "lucide-react";
import type { PropertyCardData } from "@/server/services/catalog";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatMoney, pluralize } from "@/lib/format";
import { Badge } from "@/components/ui/feedback";
import { RatingInline } from "@/components/ui/rating";
import { CardCarousel } from "./card-carousel";
import { FavoriteButton } from "./favorite-button";

export function PropertyCard({
  property,
  favorited = false,
  signedIn = false,
  query,
  priority,
}: {
  property: PropertyCardData;
  favorited?: boolean;
  signedIn?: boolean;
  query?: string;
  priority?: boolean;
}) {
  const href = `/properties/${property.slug}${query ? `?${query}` : ""}`;
  const location = [property.neighborhood, property.destination?.name].filter(Boolean).join(", ");
  const offer = property.offer;

  return (
    <article className="group relative">
      <Link href={href} className="block rounded-xl focus-visible:outline-offset-4" aria-label={`${property.name}${location ? `, ${location}` : ""}`}>
        <div className="relative overflow-hidden rounded-xl bg-ink-100">
          <CardCarousel images={property.images} name={property.name} priority={priority} />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            {offer && <Badge tone="light">{offer.discountType === "PERCENT" ? `${offer.discountValue}% off` : "Special offer"}</Badge>}
            {property.featured && !offer && <Badge tone="light">Guest favourite</Badge>}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 font-sans text-[0.9375rem] font-semibold text-ink-950">{property.name}</h3>
            <RatingInline value={property.ratingAverage?.toString() ?? null} count={property.reviewCount} className="shrink-0" />
          </div>
          {location && (
            <p className="flex items-center gap-1 text-sm text-ink-600">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">{location}</span>
            </p>
          )}
          <p className="text-sm text-ink-600">
            {PROPERTY_TYPE_LABELS[property.type]} · {pluralize(property.bedrooms, "bedroom")} · up to {property.maxGuests} guests
          </p>
          <p className="pt-1 text-[0.9375rem]">
            <span className="font-semibold tabular-nums">{formatMoney(property.basePrice, property.currency)}</span>
            <span className="text-ink-600"> / night</span>
          </p>
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton propertyId={property.id} initial={favorited} signedIn={signedIn} />
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton aspect-[4/3] rounded-xl" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3.5 w-1/2 rounded" />
        <div className="skeleton h-3.5 w-1/3 rounded" />
      </div>
    </div>
  );
}
