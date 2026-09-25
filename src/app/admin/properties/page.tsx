import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/server/db";
import { formatMoney } from "@/lib/format";
import { PROPERTY_STATUS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { ResponsiveImage } from "@/components/ui/image";
import { StatusPill } from "@/components/ui/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyRow, PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Properties" };

export default async function AdminPropertiesPage() {
  const properties = await db.property.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      destination: { select: { name: true } },
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], take: 1 },
      _count: { select: { images: true, bookings: { where: { status: { in: ["PENDING", "AWAITING_PAYMENT", "PAID", "CONFIRMED"] } } } } },
    },
  });
  return (
    <>
      <PageHeader title="Properties" description="Create, edit, publish and manage photos and availability." actions={<ButtonLink href="/admin/properties/new" variant="brand" size="sm" icon={<Plus className="size-4" />}>Add property</ButtonLink>} />
      <Table head={["Property", "Location", "Price / night", "Photos", "Active bookings", "Status"]}>
        {properties.length ? properties.map((p) => (
          <tr key={p.id} className="hover:bg-ink-50/60">
            <Td>
              <Link href={`/admin/properties/${p.id}`} className="flex items-center gap-3">
                <ResponsiveImage image={p.images[0]} alt="" sizes="56px" className="size-12 shrink-0 rounded-md" />
                <span><span className="block font-medium text-ink-950 hover:underline">{p.name}</span><span className="text-xs text-ink-500">{PROPERTY_TYPE_LABELS[p.type]} · sleeps {p.maxGuests}</span></span>
              </Link>
            </Td>
            <Td>{p.destination?.name ?? <span className="text-ink-400">—</span>}</Td>
            <Td className="tabular-nums">{formatMoney(p.basePrice, p.currency)}</Td>
            <Td className={p._count.images === 0 ? "font-medium text-warning-700" : ""}>{p._count.images === 0 ? "None yet" : p._count.images}</Td>
            <Td className="tabular-nums">{p._count.bookings}</Td>
            <Td><StatusPill status={p.status} map={PROPERTY_STATUS} /></Td>
          </tr>
        )) : <EmptyRow colSpan={6}>No properties yet. Add your first one.</EmptyRow>}
      </Table>
    </>
  );
}
