import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, Clock, MapPin, MessageCircle } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { getBookingForUser, stayIsReviewable } from "@/server/services/bookings";
import { getSettings } from "@/server/services/settings";
import { today } from "@/server/services/availability";
import { formatDateRange, formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { CANCELLATION_POLICY_COPY } from "@/lib/constants";
import { ResponsiveImage } from "@/components/ui/image";
import { BookingStatusBadge, bookingStatusLabel } from "@/components/ui/status-badge";
import { Alert, Card } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/account/cancel-booking";
import { ReviewForm } from "@/components/account/review-form";
import { LiveRefresh } from "@/components/account/live-refresh";

export const metadata = { title: "Booking details" };

export default async function BookingDetailPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ new?: string }> }) {
  const { reference } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUserPage(`/account/bookings/${reference}`);
  const booking = await getBookingForUser(user, reference);
  if (!booking) notFound();
  const settings = await getSettings();
  const policy = CANCELLATION_POLICY_COPY[booking.property.cancellationPolicy];
  const cancellable = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "PAID"].includes(booking.status) && booking.checkIn > today();
  const reviewable = stayIsReviewable(booking) && !booking.review;
  const paid = booking.payments.reduce((s, p) => s + p.amount, 0);
  const conversation = booking.conversations[0];
  const addressVisible = ["CONFIRMED", "PAID", "COMPLETED"].includes(booking.status);

  return (
    <div className="space-y-8">
      <LiveRefresh channels={["me"]} events={["booking"]} />
      <Link href="/account/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-700 hover:text-ink-950">
        <ChevronLeft className="size-4" /> All trips
      </Link>

      {isNew && booking.status === "PENDING" && (
        <div className="rounded-2xl bg-success-50 p-6 ring-1 ring-success-600/20">
          <CheckCircle2 className="size-8 text-success-600" aria-hidden />
          <h1 className="mt-3 text-h2 font-bold">Request received — your dates are held</h1>
          <p className="mt-2 text-ink-700">
            Reference <strong>{booking.reference}</strong>. We&apos;ve emailed a summary to {booking.guestEmail}. Our team will confirm and share payment details within {settings.bookingHoldHours} hours
            {booking.expiresAt ? ` (by ${formatDateTime(booking.expiresAt)})` : ""}.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {!isNew && <h1 className="text-h1 font-bold">{booking.property.name}</h1>}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-600">
            <BookingStatusBadge status={booking.status} />
            <span>Ref {booking.reference}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={conversation ? `/account/messages/${conversation.id}` : `/account/messages/new?bookingId=${booking.id}`} variant="secondary" icon={<MessageCircle className="size-4" />}>
            Message us
          </ButtonLink>
          {cancellable && <CancelBookingButton bookingId={booking.id} policy={policy.summary} />}
        </div>
      </div>

      {(booking.status === "PENDING" || booking.status === "AWAITING_PAYMENT") && booking.expiresAt && (
        <Alert tone="info" title={booking.status === "PENDING" ? "Waiting for confirmation" : "Waiting for payment"}>
          Your dates are held until {formatDateTime(booking.expiresAt)}.{" "}
          {booking.status === "AWAITING_PAYMENT" ? "Please complete payment using the details our team sent you, or message us if you need help." : "We'll notify you as soon as it's confirmed."}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-5">
          <Link href={`/properties/${booking.property.slug}`} className="flex gap-4">
            <ResponsiveImage image={booking.property.images[0]} alt="" sizes="96px" className="aspect-square w-24 shrink-0 rounded-lg" />
            <div>
              <p className="font-semibold hover:underline">{booking.property.name}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-600"><MapPin className="size-3.5" /> {booking.property.destination?.name ?? "Kenya"}</p>
            </div>
          </Link>
          <dl className="grid gap-4 border-t border-ink-100 pt-5 sm:grid-cols-2">
            <Item label="Dates" value={`${formatDateRange(booking.checkIn, booking.checkOut)} (${pluralize(booking.nights, "night")})`} />
            <Item label="Guests" value={`${pluralize(booking.adults, "adult")}${booking.children ? `, ${pluralize(booking.children, "child", "children")}` : ""}${booking.infants ? `, ${pluralize(booking.infants, "infant")}` : ""}`} />
            <Item label="Check-in" value={`After ${booking.property.checkInTime}`} />
            <Item label="Check-out" value={`Before ${booking.property.checkOutTime}`} />
            {addressVisible && booking.property.addressLine && <Item label="Address" value={booking.property.addressLine} />}
            {booking.specialRequests && <Item label="Your notes" value={booking.specialRequests} />}
          </dl>
          <p className="border-t border-ink-100 pt-5 text-sm text-ink-600"><strong className="text-ink-900">{policy.label} cancellation:</strong> {policy.summary}</p>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-sans text-base font-semibold">Price details</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={`${formatMoney(booking.nightlyRate, booking.currency)} × ${pluralize(booking.nights, "night")}`} value={formatMoney(booking.subtotal, booking.currency)} />
              {booking.discountAmount > 0 && <Row label="Discount" value={`−${formatMoney(booking.discountAmount, booking.currency)}`} className="text-success-700" />}
              {booking.cleaningFee > 0 && <Row label="Cleaning fee" value={formatMoney(booking.cleaningFee, booking.currency)} />}
              <Row label="Total" value={formatMoney(booking.total, booking.currency)} className="border-t border-ink-100 pt-2 font-semibold" />
              {paid > 0 && <Row label="Paid" value={formatMoney(paid, booking.currency)} className="text-success-700" />}
            </dl>
          </Card>
          <Card>
            <h2 className="font-sans text-base font-semibold">Status history</h2>
            <ol className="mt-4 space-y-4">
              {booking.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <Clock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
                  <div>
                    <p className="font-medium">{bookingStatusLabel(e.toStatus)}</p>
                    <p className="text-ink-500">{formatDateTime(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {reviewable && <ReviewForm bookingId={booking.id} propertyName={booking.property.name} />}
      {booking.review && <Alert tone="success">Thanks — you reviewed this stay.</Alert>}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between gap-4 ${className ?? ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
