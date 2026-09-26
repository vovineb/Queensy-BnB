import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/server/db";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { EmptyRow, PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Destinations" };

export default async function AdminDestinationsPage() {
  const items = await db.destination.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { properties: true } } } });
  return (
    <>
      <PageHeader title="Destinations" description="Each destination gets its own SEO-friendly guide page listing its stays." actions={<ButtonLink href="/admin/destinations/new" size="sm" variant="brand" icon={<Plus className="size-4" />}>New destination</ButtonLink>} />
      <Table head={["Destination", "Region", "Properties", "Order", "Status"]}>
        {items.length ? items.map((d) => (
          <tr key={d.id} className="hover:bg-ink-50/60">
            <Td><Link href={`/admin/destinations/${d.id}`} className="font-medium hover:underline">{d.name}</Link>{d.featured && <span className="ml-2 text-xs text-ink-500">featured</span>}</Td>
            <Td>{d.region ?? "—"}</Td>
            <Td>{d._count.properties}</Td>
            <Td>{d.sortOrder}</Td>
            <Td><Badge tone={d.published ? "success" : "neutral"}>{d.published ? "Published" : "Hidden"}</Badge></Td>
          </tr>
        )) : <EmptyRow colSpan={5}>No destinations yet.</EmptyRow>}
      </Table>
    </>
  );
}
