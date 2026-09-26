import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { getAdminBooking } from "@/server/services/admin/bookings";
import { BOOKING_TRANSITIONS } from "@/server/services/bookings";
import { formatDateRange, formatDateTime, formatMoney, fromMinorUnits, pluralize } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { bookingStatusLabel, BookingStatusBadge } from "@/components/ui/status-badge";
import { PageHeader, Panel } from "@/components/admin/ui";
import { BookingActions } from "@/components/admin/booking-actions";
import { Alert } from "@/components/ui/feedback";

export const metadata = { title: "Booking" };

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getAdminBooking(id);
  if (!b) notFound();
  const paid = b.payments.filter((p) => p.status === "SUCCEEDED").reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, b.total - paid);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bookings", label: "Bookings" }}
        title={<span className="flex flex-wrap items-center gap-3">{b.reference} <BookingStatusBadge status={b.status} /></span>}
        description={`${b.property.name} · ${formatDateRange(b.checkIn, b.checkOut)} · requested ${formatDateTime(b.createdAt)}`}
      />
      {(b.status === "PENDING" || b.status === "AWAITING_PAYMENT") && b.expiresAt && (
        <Alert tone={b.expiresAt < new Date() ? "danger" : "warning"} className="mb-6" title={b.expiresAt < new Date() ? "Hold has expired" : "Dates are on hold"}>
          {b.expiresAt < new Date() ? "This request will be marked expired automatically and the dates released." : `Held until ${formatDateTime(b.expiresAt)}. Confirm, request payment, or extend the hold.`}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel title="Actions">
            <BookingActions
              bookingId={b.id}
              status={b.status}
              allowed={BOOKING_TRANSITIONS[b.status]}
              currency={b.currency}
              outstanding={fromMinorUnits(outstanding, b.currency)}
              canExtend={b.status === "PENDING" || b.status === "AWAITING_PAYMENT"}
            />
          </Panel>

          <Panel title="Stay">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Property"><Link href={`/admin/properties/${b.property.id}`} className="font-medium text-lagoon-800 hover:underline">{b.property.name}</Link></Item>
              <Item label="Dates">{formatDateRange(b.checkIn, b.checkOut)} ({pluralize(b.nights, "night")})</Item>
              <Item label="Guests">{pluralize(b.adults, "adult")}{b.children ? `, ${pluralize(b.children, "child", "children")}` : ""}{b.infants ? `, ${pluralize(b.infants, "infant")}` : ""}</Item>
              <Item label="Special requests">{b.specialRequests || <span className="text-ink-400">None</span>}</Item>
              {b.cancellationReason && <Item label="Cancellation reason">{b.cancellationReason}</Item>}
            </dl>
          </Panel>

          <Panel title="Price & payments">
            <dl className="space-y-2 text-sm">
              <Row label={`${formatMoney(b.nightlyRate, b.currency)} × ${pluralize(b.nights, "night")}`} value={formatMoney(b.subtotal, b.currency)} />
              {b.discountAmount > 0 && <Row label={`Discount${b.offer ? ` (${b.offer.title})` : ""}`} value={`−${formatMoney(b.discountAmount, b.currency)}`} />}
              {b.cleaningFee > 0 && <Row label="Cleaning fee" value={formatMoney(b.cleaningFee, b.currency)} />}
              <Row label="Total" value={formatMoney(b.total, b.currency)} strong />
              <Row label="Paid" value={formatMoney(paid, b.currency)} />
              <Row label="Outstanding" value={formatMoney(outstanding, b.currency)} strong />
            </dl>
            {b.payments.length > 0 && (
              <ul className="mt-4 divide-y divide-ink-100 border-t border-ink-100 text-sm">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-4 py-2.5">
                    <span>{formatMoney(p.amount, p.currency)} · {p.method ?? p.provider}{p.providerRef ? ` · ${p.providerRef}` : ""}<span className="block text-xs text-ink-500">Recorded by {p.recordedBy?.name ?? "system"}</span></span>
                    <span className="text-ink-500">{formatDateTime(p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="History">
            <ol className="space-y-3 text-sm">
              {b.events.map((e) => (
                <li key={e.id} className="flex justify-between gap-4">
                  <span><span className="font-medium">{bookingStatusLabel(e.toStatus)}</span>{e.note && <span className="text-ink-600"> — {e.note}</span>}<span className="block text-xs text-ink-500">{e.actor?.name ?? "System"}</span></span>
                  <span className="shrink-0 text-ink-500">{formatDateTime(e.createdAt)}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Guest">
            <p className="font-medium">{b.guestName}</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href={`mailto:${b.guestEmail}`} className="inline-flex items-center gap-2 break-all hover:underline"><Mail className="size-4 shrink-0 text-ink-500" />{b.guestEmail}</a></li>
              {b.guestPhone && <li><a href={`tel:${b.guestPhone}`} className="inline-flex items-center gap-2 hover:underline"><Phone className="size-4 text-ink-500" />{formatPhone(b.guestPhone)}</a></li>}
            </ul>
            {b.user ? (
              <Link href={`/admin/users/${b.user.id}`} className="mt-4 inline-block text-sm font-medium text-lagoon-700 hover:underline">View customer profile</Link>
            ) : (
              <p className="mt-4 text-xs text-ink-500">Imported legacy booking — not yet linked to an account.</p>
            )}
          </Panel>
          <Panel title="Conversation">
            {b.conversations.length ? (
              b.conversations.map((c) => <Link key={c.id} href={`/admin/inbox/${c.id}`} className="flex items-center gap-2 text-sm font-medium text-lagoon-700 hover:underline"><MessageCircle className="size-4" /> {c.subject}</Link>)
            ) : (
              <p className="text-sm text-ink-500">No messages about this booking yet. The guest can message from their trip page.</p>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-ink-500">{label}</dt><dd className="mt-0.5">{children}</dd></div>;
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>;
}
