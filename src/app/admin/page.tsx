import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { attentionItems, bookingTrend, dashboardMetrics, propertyPerformance, recentActivity } from "@/server/services/admin/metrics";
import { maybeRunMaintenance } from "@/server/services/availability";
import { emailConfigured } from "@/server/services/mailer";
import { formatDateTime, formatMoney, formatRelativeTime } from "@/lib/format";
import { PageHeader, Panel, StatCard, Table, Td, EmptyRow } from "@/components/admin/ui";
import { BookingTrendChart } from "@/components/admin/trend-chart";
import { Alert } from "@/components/ui/feedback";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function money(list: { currency: string; amount: number }[], fallback: string) {
  if (list.length === 0) return formatMoney(0, fallback);
  return list.map((r) => formatMoney(r.amount, r.currency)).join(" + ");
}

export default async function AdminOverview() {
  await maybeRunMaintenance();
  const [m, trend, perf, attention, activity] = await Promise.all([dashboardMetrics(30), bookingTrend(30), propertyPerformance(30), attentionItems(), recentActivity(10)]);

  return (
    <>
      <PageHeader title="Overview" description="Last 30 days unless noted." />
      {!emailConfigured() && (
        <Alert tone="warning" className="mb-6" title="Email delivery isn't configured">
          Booking confirmations, password resets and reply notifications are not being emailed. Set <code>SMTP_URL</code> on the server to enable them.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending requests (now)" value={m.pendingRequests} hint="Awaiting confirmation or payment" href="/admin/bookings?status=PENDING" tone={m.pendingRequests ? "attention" : "default"} />
        <StatCard label="Booking requests" value={m.bookingsCreated} hint="Created online" href="/admin/bookings" />
        <StatCard label="Arrivals next 7 days" value={m.upcomingArrivals} hint="Confirmed or paid" href="/admin/calendar" />
        <StatCard label="Open inquiries" value={m.openInquiries} href="/admin/inquiries" tone={m.openInquiries ? "attention" : "default"} />
        <StatCard label="Payments recorded" value={money(m.paymentsRecorded, m.defaultCurrency)} hint="Payments marked received" />
        <StatCard label="Confirmed booking value" value={money(m.confirmedValue, m.defaultCurrency)} hint="Bookings made in period, now confirmed/paid/completed" />
        <StatCard label="Active listings" value={m.activeListings} href="/admin/properties" />
        <StatCard label="Customers" value={m.customers} hint={`+${m.newCustomers} new`} href="/admin/users" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Booking requests per day">
          <BookingTrendChart data={trend} />
        </Panel>
        <Panel title="Needs attention">
          <ul className="space-y-3 text-sm">
            {attention.expiring.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className="flex items-start gap-3 rounded-lg p-2 hover:bg-ink-50">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-600" aria-hidden />
                  <span>
                    <span className="font-medium">{b.reference}</span> · {b.guestName} · {b.property.name}
                    <span className="block text-ink-500">Hold {b.expiresAt && b.expiresAt < new Date() ? "expired" : `expires ${formatRelativeTime(b.expiresAt!)}`}</span>
                  </span>
                </Link>
              </li>
            ))}
            {attention.awaitingReply > 0 && (
              <li><Link href="/admin/inbox" className="flex items-center justify-between rounded-lg p-2 hover:bg-ink-50"><span>{attention.awaitingReply} conversation{attention.awaitingReply === 1 ? "" : "s"} waiting for a reply</span><ArrowRight className="size-4" /></Link></li>
            )}
            {attention.newInquiries > 0 && (
              <li><Link href="/admin/inquiries" className="flex items-center justify-between rounded-lg p-2 hover:bg-ink-50"><span>{attention.newInquiries} new inquir{attention.newInquiries === 1 ? "y" : "ies"}</span><ArrowRight className="size-4" /></Link></li>
            )}
            {!attention.expiring.length && !attention.awaitingReply && !attention.newInquiries && <li className="p-2 text-ink-500">Nothing urgent right now.</li>}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Property performance</h2>
          <Table head={["Property", "Views", "Started booking", "Requests", "Saves"]}>
            {perf.length ? perf.map((p) => (
              <tr key={p.id}>
                <Td><Link href={`/admin/properties/${p.id}`} className="font-medium hover:underline">{p.name}</Link>{p.status !== "PUBLISHED" && <span className="ml-2 text-xs text-ink-500">({p.status.toLowerCase()})</span>}</Td>
                <Td className="tabular-nums">{p.views}</Td>
                <Td className="tabular-nums">{p.starts}</Td>
                <Td className="tabular-nums">{p.requests}</Td>
                <Td className="tabular-nums">{p.saves}</Td>
              </tr>
            )) : <EmptyRow colSpan={5}>No properties yet.</EmptyRow>}
          </Table>
        </div>
        <Panel title="Recent activity" actions={<Link href="/admin/audit-log" className="text-sm font-medium text-lagoon-700 hover:underline">All</Link>}>
          <ul className="space-y-3 text-sm">
            {activity.length ? activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-4">
                <span><span className="font-medium">{a.actor?.name ?? "System"}</span> <span className="text-ink-600">{a.action.replace(/[._]/g, " ")}</span></span>
                <time className="shrink-0 text-ink-500" dateTime={a.createdAt.toISOString()} title={formatDateTime(a.createdAt)}>{formatRelativeTime(a.createdAt)}</time>
              </li>
            )) : <li className="text-ink-500">No activity yet.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
