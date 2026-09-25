import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/server/db";
import { today } from "@/server/services/availability";
import { fromMinorUnits } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PROPERTY_STATUS } from "@/lib/constants";
import { PageHeader } from "@/components/admin/ui";
import { PropertyForm } from "@/components/admin/property-form";
import { PhotoManager } from "@/components/admin/photo-manager";
import { AvailabilityManager } from "@/components/admin/availability-manager";
import { PropertyStatusControls } from "@/components/admin/property-status";
import { StatusPill } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/feedback";
import { toIsoDate } from "@/lib/dates";

export const metadata = { title: "Edit property" };

const TABS = [
  { id: "details", label: "Details" },
  { id: "photos", label: "Photos" },
  { id: "availability", label: "Availability" },
];

export default async function EditPropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; created?: string }> }) {
  const { id } = await params;
  const { tab = "details", created } = await searchParams;
  const property = await db.property.findUnique({
    where: { id },
    include: {
      amenities: { include: { amenity: { select: { slug: true } } } },
      rooms: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: [{ sortOrder: "asc" }] },
      availabilityBlocks: { where: { endDate: { gt: today() } }, orderBy: { startDate: "asc" } },
      bookings: { where: { status: { in: ["PENDING", "AWAITING_PAYMENT", "PAID", "CONFIRMED"] }, checkOut: { gt: today() } }, orderBy: { checkIn: "asc" }, select: { id: true, reference: true, checkIn: true, checkOut: true, status: true, guestName: true } },
    },
  });
  if (!property) notFound();
  const [destinations, amenities] = await Promise.all([
    db.destination.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.amenity.findMany({ select: { slug: true, name: true, category: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/properties", label: "Properties" }}
        title={<span className="flex flex-wrap items-center gap-3">{property.name} <StatusPill status={property.status} map={PROPERTY_STATUS} /></span>}
        actions={
          <>
            {property.status === "PUBLISHED" && (
              <Link href={`/properties/${property.slug}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-sm px-3 text-sm font-semibold ring-1 ring-inset ring-ink-200 hover:bg-surface">
                <ExternalLink className="size-4" /> View live
              </Link>
            )}
            <PropertyStatusControls propertyId={property.id} status={property.status} />
          </>
        }
      />
      {created && <Alert tone="success" className="mb-6" title="Property created as a draft">Add photos below, then publish it when you&apos;re ready.</Alert>}

      <nav className="mb-6 flex gap-1 border-b border-ink-200" aria-label="Property sections">
        {TABS.map((t) => (
          <Link key={t.id} href={`?tab=${t.id}`} aria-current={tab === t.id ? "page" : undefined} className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium", tab === t.id ? "border-ink-950 text-ink-950" : "border-transparent text-ink-500 hover:text-ink-900")}>
            {t.label}{t.id === "photos" ? ` (${property.images.length})` : ""}
          </Link>
        ))}
      </nav>

      {tab === "photos" ? (
        <PhotoManager propertyId={property.id} images={property.images.map((i) => ({ id: i.id, url: i.url, storageKey: i.storageKey, alt: i.alt, caption: i.caption, isCover: i.isCover }))} />
      ) : tab === "availability" ? (
        <AvailabilityManager
          propertyId={property.id}
          today={toIsoDate(today())}
          blocks={property.availabilityBlocks.map((b) => ({ id: b.id, start: toIsoDate(b.startDate), end: toIsoDate(b.endDate), reason: b.reason }))}
          bookings={property.bookings.map((b) => ({ ...b, checkIn: toIsoDate(b.checkIn), checkOut: toIsoDate(b.checkOut) }))}
        />
      ) : (
        <PropertyForm
          propertyId={property.id}
          destinations={destinations}
          amenities={amenities}
          values={{
            name: property.name, slug: property.slug, type: property.type, featured: property.featured, summary: property.summary, description: property.description,
            destinationId: property.destinationId ?? "", neighborhood: property.neighborhood ?? "", addressLine: property.addressLine ?? "",
            latitude: property.latitude?.toString() ?? "", longitude: property.longitude?.toString() ?? "", maxGuests: property.maxGuests, bedrooms: property.bedrooms,
            beds: property.beds, bathrooms: Number(property.bathrooms), currency: property.currency, basePrice: fromMinorUnits(property.basePrice, property.currency),
            cleaningFee: fromMinorUnits(property.cleaningFee, property.currency), minNights: property.minNights, maxNights: property.maxNights?.toString() ?? "",
            checkInTime: property.checkInTime, checkOutTime: property.checkOutTime, houseRules: property.houseRules ?? "", cancellationPolicy: property.cancellationPolicy,
            cancellationNotes: property.cancellationNotes ?? "", amenities: property.amenities.map((a) => a.amenity.slug), rooms: property.rooms.map((r) => ({ name: r.name, beds: r.beds })),
          }}
        />
      )}
    </>
  );
}
