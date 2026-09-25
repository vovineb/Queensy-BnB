import Link from "next/link";
import { db } from "@/server/db";
import type { Prisma, ProspectStatus } from "@/generated/prisma/client";
import { abandonedBookingFlows } from "@/server/services/admin/metrics";
import { prospectFromUserAction } from "@/server/actions/admin/people";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/feedback";
import { EmptyRow, FilterBar, filterInput, PageHeader, Panel, Table, Td } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/inline-actions";

export const metadata = { title: "Prospects" };

const PROSPECT_STATUS: Record<ProspectStatus, { label: string; tone: "neutral" | "brand" | "success" | "warning" | "danger" }> = {
  NEW: { label: "New", tone: "warning" }, CONTACTED: { label: "Contacted", tone: "brand" }, QUALIFIED: { label: "Qualified", tone: "brand" }, CONVERTED: { label: "Converted", tone: "success" }, LOST: { label: "Lost", tone: "neutral" },
};
const SOURCE: Record<string, string> = { INQUIRY: "Inquiry", ABANDONED_BOOKING: "Abandoned booking", NEWSLETTER: "Newsletter", SIGNUP: "Sign-up", MANUAL: "Manual" };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ status?: string; source?: string; consent?: string; q?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.ProspectWhereInput = {
    ...(sp.status && sp.status in PROSPECT_STATUS ? { status: sp.status as ProspectStatus } : {}),
    ...(sp.source && sp.source in SOURCE ? { source: sp.source as Prisma.ProspectWhereInput["source"] } : {}),
    ...(sp.consent === "yes" ? { marketingConsent: true } : sp.consent === "no" ? { marketingConsent: false } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [prospects, abandoned] = await Promise.all([
    db.prospect.findMany({ where, orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], take: 200, include: { _count: { select: { notes: true, inquiries: true } } } }),
    abandonedBookingFlows(30),
  ]);
  const known = new Set((await db.prospect.findMany({ where: { userId: { in: abandoned.map((a) => a.user_id) } }, select: { userId: true } })).map((p) => p.userId));

  return (
    <>
      <PageHeader title="Prospects" description="People who've shown interest. Marketing consent is tracked separately: reply to inquiries freely, but only send promotions to those who opted in." />
      <FilterBar action="/admin/prospects">
        <input name="q" defaultValue={sp.q} placeholder="Name or email" className={`${filterInput} w-full sm:w-56`} aria-label="Search prospects" />
        <select name="status" defaultValue={sp.status ?? ""} className={filterInput} aria-label="Status"><option value="">All statuses</option>{Object.entries(PROSPECT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}</select>
        <select name="source" defaultValue={sp.source ?? ""} className={filterInput} aria-label="Source"><option value="">All sources</option>{Object.entries(SOURCE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select name="consent" defaultValue={sp.consent ?? ""} className={filterInput} aria-label="Marketing consent"><option value="">Any consent</option><option value="yes">Marketing opt-in</option><option value="no">No marketing consent</option></select>
      </FilterBar>
      <Table head={["Name", "Source", "Status", "Marketing", "Last contacted", "Follow up", "Activity"]}>
        {prospects.length ? prospects.map((p) => (
          <tr key={p.id} className="hover:bg-ink-50/60">
            <Td><Link href={`/admin/prospects/${p.id}`} className="font-medium hover:underline">{p.name ?? p.email ?? "Unknown"}</Link><span className="block text-xs text-ink-500">{p.email}</span></Td>
            <Td>{SOURCE[p.source]}</Td>
            <Td><Badge tone={PROSPECT_STATUS[p.status].tone}>{PROSPECT_STATUS[p.status].label}</Badge></Td>
            <Td>{p.marketingConsent ? <Badge tone="success">Opted in</Badge> : <span className="text-ink-500">No</span>}</Td>
            <Td className="whitespace-nowrap">{p.lastContactedAt ? formatRelativeTime(p.lastContactedAt) : "—"}</Td>
            <Td className="whitespace-nowrap">{p.nextFollowUpAt ? formatDate(p.nextFollowUpAt) : "—"}</Td>
            <Td className="text-xs text-ink-500">{p._count.inquiries} inquir{p._count.inquiries === 1 ? "y" : "ies"} · {p._count.notes} note{p._count.notes === 1 ? "" : "s"}</Td>
          </tr>
        )) : <EmptyRow colSpan={7}>No prospects match.</EmptyRow>}
      </Table>

      <Panel className="mt-8" title="Abandoned booking flows (last 30 days)">
        <p className="mb-4 text-sm text-ink-600">Signed-in customers who started a booking but didn&apos;t submit it within 24 hours. You may follow up about their trip; only send promotions if they opted in.</p>
        {abandoned.length ? (
          <ul className="divide-y divide-ink-100 text-sm">
            {abandoned.map((a) => (
              <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span><Link href={`/admin/users/${a.user_id}`} className="font-medium hover:underline">{a.name}</Link> · {a.email}<span className="block text-xs text-ink-500">{a.property_name ?? "A stay"} · {formatRelativeTime(a.started_at)} · {a.marketing ? "opted in to marketing" : "no marketing consent"}</span></span>
                {known.has(a.user_id) ? <span className="text-xs text-ink-500">Already a prospect</span> : <ActionButton onClick={prospectFromUserAction.bind(null, a.user_id)}>Add to prospects</ActionButton>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-500">None right now.</p>}
      </Panel>
    </>
  );
}
