import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/server/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { EmptyRow, PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Offers" };

export default async function AdminOffersPage() {
  const now = new Date();
  const offers = await db.offer.findMany({ orderBy: [{ active: "desc" }, { endsAt: "desc" }], include: { _count: { select: { properties: true, bookings: true } } } });
  const currency = process.env.DEFAULT_CURRENCY || "KES";
  return (
    <>
      <PageHeader title="Offers & promotions" description="Discounts apply automatically at checkout when a stay's check-in date is inside the offer window." actions={<ButtonLink href="/admin/offers/new" size="sm" variant="brand" icon={<Plus className="size-4" />}>New offer</ButtonLink>} />
      <Table head={["Offer", "Discount", "Check-in window", "Applies to", "Used by", "Status"]}>
        {offers.length ? offers.map((o) => {
          const state = !o.active ? { l: "Inactive", t: "neutral" as const } : o.endsAt < now ? { l: "Ended", t: "neutral" as const } : o.startsAt > now ? { l: "Scheduled", t: "warning" as const } : { l: "Live", t: "success" as const };
          return (
            <tr key={o.id} className="hover:bg-ink-50/60">
              <Td><Link href={`/admin/offers/${o.id}`} className="font-medium hover:underline">{o.title}</Link>{o.showBanner && <span className="ml-2 text-xs text-ink-500">banner</span>}</Td>
              <Td>{o.discountType === "PERCENT" ? `${o.discountValue}%` : formatMoney(o.discountValue, currency)}{o.minNights > 1 ? ` · ${o.minNights}+ nights` : ""}</Td>
              <Td className="whitespace-nowrap">{formatDate(o.startsAt)} – {formatDate(o.endsAt)}</Td>
              <Td>{o.appliesToAll ? "All stays" : `${o._count.properties} stay${o._count.properties === 1 ? "" : "s"}`}</Td>
              <Td>{o._count.bookings} booking{o._count.bookings === 1 ? "" : "s"}</Td>
              <Td><Badge tone={state.t}>{state.l}</Badge></Td>
            </tr>
          );
        }) : <EmptyRow colSpan={6}>No offers yet.</EmptyRow>}
      </Table>
    </>
  );
}
