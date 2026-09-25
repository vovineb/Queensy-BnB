import { db } from "@/server/db";
import { PageHeader } from "@/components/admin/ui";
import { PropertyForm } from "@/components/admin/property-form";

export const metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  const [destinations, amenities] = await Promise.all([
    db.destination.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.amenity.findMany({ select: { slug: true, name: true, category: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);
  return (
    <>
      <PageHeader back={{ href: "/admin/properties", label: "Properties" }} title="Add a property" description="It's saved as a draft. Add photos next, then publish when you're ready." />
      <PropertyForm
        propertyId={null}
        destinations={destinations}
        amenities={amenities}
        values={{
          name: "", slug: "", type: "APARTMENT", featured: false, summary: "", description: "", destinationId: destinations[0]?.id ?? "", neighborhood: "", addressLine: "",
          latitude: "", longitude: "", maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: 1, currency: process.env.DEFAULT_CURRENCY || "KES", basePrice: 0, cleaningFee: 0,
          minNights: 1, maxNights: "", checkInTime: "14:00", checkOutTime: "10:00", houseRules: "", cancellationPolicy: "MODERATE", cancellationNotes: "", amenities: [], rooms: [],
        }}
      />
    </>
  );
}
