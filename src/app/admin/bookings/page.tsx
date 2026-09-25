import Link from "next/link";
import { Download } from "lucide-react";
import { db } from "@/server/db";
import { BOOKING_STATUSES, listAdminBookings, type BookingFilters } from "@/server/services/admin/bookings";
import { formatDateRange, formatDateTime, formatMoney } from "@/lib/format";
import { bookingStatusLabel, BookingStatusBadge } from "@/components/ui/status-badge";
import { EmptyRow, FilterBar, filterInput, PageHeader, Table, Td } from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Bookings" };

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<BookingFilters> }) {
  const f = await searchParams;
  const [result, properties] = await Promise.all([listAdminBookings(f), db.property.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>), ...extra }).toString();

  return (
    <>
      <PageHeader
        title="Bookings"
        description={`${result.total} booking${result.total === 1 ? "" : "s"}`}
        actions={<a href={`/admin/bookings/export?${qs({})}`} className={buttonClasses({ variant: "secondary", size: "sm" })}><Download className="size-4" /> Export CSV</a>}
      />
      <FilterBar action="/admin/bookings">
        <input name="q" defaultValue={f.q} placeholder="Reference, guest, email or phone" className={`${filterInput} w-full sm:w-64`} aria-label="Search bookings" />
        <select name="status" defaultValue={f.status ?? ""} className={filterInput} aria-label="Status">
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{bookingStatusLabel(s)}</option>)}
        </select>
        <select name="propertyId" defaultValue={f.propertyId ?? ""} className={filterInput} aria-label="Property">
          <option value="">All properties</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="text-xs text-ink-500">Staying from<input type="date" name="from" defaultValue={f.from} className={`${filterInput} block`} /></label>
        <label className="text-xs text-ink-500">to<input type="date" name="to" defaultValue={f.to} className={`${filterInput} block`} /></label>
      </FilterBar>
      <Table head={["Reference", "Guest", "Property", "Stay", "Total", "Status", "Requested"]}>
        {result.rows.length ? result.rows.map((b) => (
          <tr key={b.id} className="hover:bg-ink-50/60">
            <Td><Link href={`/admin/bookings/${b.id}`} className="font-medium text-lagoon-800 hover:underline">{b.reference}</Link>{b.legacyId && <span className="ml-1.5 text-xs text-ink-400">legacy</span>}</Td>
            <Td><span className="block font-medium">{b.guestName}</span><span className="text-xs text-ink-500">{b.guestEmail}</span></Td>
            <Td>{b.property.name}</Td>
            <Td className="whitespace-nowrap">{formatDateRange(b.checkIn, b.checkOut)}<span className="block text-xs text-ink-500">{b.nights} night{b.nights === 1 ? "" : "s"}</span></Td>
            <Td className="whitespace-nowrap tabular-nums">{formatMoney(b.total, b.currency)}</Td>
            <Td><BookingStatusBadge status={b.status} /></Td>
            <Td className="whitespace-nowrap text-ink-600">{formatDateTime(b.createdAt)}</Td>
          </tr>
        )) : <EmptyRow colSpan={7}>No bookings match these filters.</EmptyRow>}
      </Table>
      <div className="mt-6"><Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => `/admin/bookings?${qs({ page: String(p) })}`} /></div>
    </>
  );
}
