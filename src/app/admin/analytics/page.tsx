import Link from "next/link";
import { engagement, propertyPerformance } from "@/server/services/admin/metrics";
import { cn } from "@/lib/cn";
import { PageHeader, Panel, StatCard, Table, Td, EmptyRow } from "@/components/admin/ui";

export const metadata = { title: "Engagement" };

const RANGES = [7, 30, 90];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const days = RANGES.includes(Number(d)) ? Number(d) : 30;
  const [e, perf] = await Promise.all([engagement(days), propertyPerformance(days)]);
  const funnel = [
    { label: "Viewed a property", value: e.propertyViews },
    { label: "Started a booking", value: e.bookingStarts },
    { label: "Sent a booking request", value: e.bookingRequests },
  ];
  const max = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <>
      <PageHeader
        title="Engagement"
        description="First-party, privacy-friendly analytics (visitors who send Do-Not-Track are not counted)."
        actions={
          <div className="flex rounded-lg bg-surface p-1 ring-1 ring-ink-200" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r} href={`?days=${r}`} aria-current={r === days ? "true" : undefined} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", r === days ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")}>{r} days</Link>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Unique visitors" value={e.uniqueVisitors} hint={`${e.returningVisitors} returned on another day`} />
        <StatCard label="Page views" value={e.pageViews} />
        <StatCard label="Searches" value={e.searches} hint={`${e.filtersUsed} used filters`} />
        <StatCard label="New accounts" value={e.signups} />
        <StatCard label="Saved to favourites" value={e.favorites} />
        <StatCard label="Messages sent" value={e.messages} />
        <StatCard label="Contact form opened" value={e.contactStarts} />
        <StatCard label="Guest cancellations" value={e.cancellations} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Booking funnel">
          <ol className="space-y-4">
            {funnel.map((f, i) => (
              <li key={f.label}>
                <div className="flex justify-between text-sm"><span>{f.label}</span><span className="font-semibold tabular-nums">{f.value}{i > 0 && funnel[i - 1].value > 0 && <span className="ml-2 font-normal text-ink-500">({Math.round((f.value / funnel[i - 1].value) * 100)}% of previous)</span>}</span></div>
                <div className="mt-1.5 h-3 rounded bg-ink-100" aria-hidden><div className="h-3 rounded-r bg-chart-1" style={{ width: `${(f.value / max) * 100}%` }} /></div>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Top searched destinations">
          {e.topSearches.length ? (
            <ul className="divide-y divide-ink-100 text-sm">{e.topSearches.map((s) => <li key={s.destination} className="flex justify-between py-2"><span>{s.destination}</span><span className="tabular-nums font-medium">{s.count}</span></li>)}</ul>
          ) : <p className="text-sm text-ink-500">No searches recorded yet.</p>}
        </Panel>
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold">By property</h2>
      <Table head={["Property", "Views", "Saves", "Started booking", "Requests", "View → request"]}>
        {perf.length ? perf.map((p) => (
          <tr key={p.id}>
            <Td><Link href={`/admin/properties/${p.id}`} className="font-medium hover:underline">{p.name}</Link></Td>
            <Td className="tabular-nums">{p.views}</Td>
            <Td className="tabular-nums">{p.saves}</Td>
            <Td className="tabular-nums">{p.starts}</Td>
            <Td className="tabular-nums">{p.requests}</Td>
            <Td className="tabular-nums">{p.views ? `${((p.requests / p.views) * 100).toFixed(1)}%` : "—"}</Td>
          </tr>
        )) : <EmptyRow colSpan={6}>No data.</EmptyRow>}
      </Table>
    </>
  );
}
