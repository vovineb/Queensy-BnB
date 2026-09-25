import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { toIsoDate, addDays } from "@/lib/dates";
import { fromMinorUnits } from "@/lib/format";
import { today } from "@/server/services/availability";
import { PageHeader } from "@/components/admin/ui";
import { OfferForm } from "@/components/admin/offer-form";

export const metadata = { title: "Offer" };

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const [offer, properties] = await Promise.all([
    isNew ? null : db.offer.findUnique({ where: { id }, include: { properties: { select: { propertyId: true } } } }),
    db.property.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!isNew && !offer) notFound();
  const currency = process.env.DEFAULT_CURRENCY || "KES";
  return (
    <>
      <PageHeader back={{ href: "/admin/offers", label: "Offers" }} title={offer ? offer.title : "New offer"} />
      <OfferForm
        offerId={offer?.id ?? null}
        currency={currency}
        properties={properties}
        values={offer ? {
          title: offer.title, description: offer.description ?? "", promoCopy: offer.promoCopy ?? "", imageUrl: offer.imageUrl ?? "", discountType: offer.discountType,
          discountValue: offer.discountType === "FIXED" ? fromMinorUnits(offer.discountValue, currency) : offer.discountValue, minNights: offer.minNights,
          startsAt: toIsoDate(offer.startsAt), endsAt: toIsoDate(offer.endsAt), active: offer.active, showBanner: offer.showBanner, appliesToAll: offer.appliesToAll,
          propertyIds: offer.properties.map((p) => p.propertyId),
        } : {
          title: "", description: "", promoCopy: "", imageUrl: "", discountType: "PERCENT", discountValue: 10, minNights: 1,
          startsAt: toIsoDate(today()), endsAt: toIsoDate(addDays(today(), 30)), active: true, showBanner: false, appliesToAll: true, propertyIds: [],
        }}
      />
    </>
  );
}
