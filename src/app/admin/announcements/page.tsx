import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/server/db";
import { formatDate } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { EmptyRow, PageHeader, Table, Td } from "@/components/admin/ui";

export const metadata = { title: "Announcements" };

const KIND_LABELS: Record<string, string> = { PRICE_UPDATE: "Price update", NEW_PROPERTY: "New property", SPECIAL_OFFER: "Special offer", SEASONAL: "Seasonal campaign", SERVICE: "Service update" };

export default async function AdminAnnouncementsPage() {
  const now = new Date();
  const items = await db.announcement.findMany({ orderBy: { publishAt: "desc" } });
  return (
    <>
      <PageHeader title="Announcements" description="Price updates, new stays, campaigns and service news. Live announcements appear on the homepage and in the site banner." actions={<ButtonLink href="/admin/announcements/new" size="sm" variant="brand" icon={<Plus className="size-4" />}>New announcement</ButtonLink>} />
      <Table head={["Title", "Type", "Publish", "Expires", "Status"]}>
        {items.length ? items.map((a) => {
          const live = a.status === "PUBLISHED" && a.publishAt <= now && (!a.expiresAt || a.expiresAt > now);
          const state = a.status === "DRAFT" ? { l: "Draft", t: "warning" as const } : a.status === "ARCHIVED" ? { l: "Archived", t: "neutral" as const } : live ? { l: "Live", t: "success" as const } : a.publishAt > now ? { l: "Scheduled", t: "brand" as const } : { l: "Expired", t: "neutral" as const };
          return (
            <tr key={a.id} className="hover:bg-ink-50/60">
              <Td><Link href={`/admin/announcements/${a.id}`} className="font-medium hover:underline">{a.title}</Link></Td>
              <Td>{KIND_LABELS[a.kind]}</Td>
              <Td className="whitespace-nowrap">{formatDate(a.publishAt)}</Td>
              <Td className="whitespace-nowrap">{a.expiresAt ? formatDate(a.expiresAt) : "—"}</Td>
              <Td><Badge tone={state.t}>{state.l}</Badge></Td>
            </tr>
          );
        }) : <EmptyRow colSpan={5}>No announcements yet.</EmptyRow>}
      </Table>
    </>
  );
}
