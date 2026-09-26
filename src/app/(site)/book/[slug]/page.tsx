import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { requireUserPage } from "@/server/auth/guards";
import { getPropertyBySlug } from "@/server/services/catalog";
import { quoteStay } from "@/server/services/bookings";
import { getSettings } from "@/server/services/settings";
import { isAppError } from "@/server/errors";
import { isIsoDate } from "@/lib/dates";
import { formatDateRange, formatMoney, pluralize } from "@/lib/format";
import { CANCELLATION_POLICY_COPY } from "@/lib/constants";
import { ResponsiveImage } from "@/components/ui/image";
import { RatingInline } from "@/components/ui/rating";
import { Alert, Card } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Confirm and book", robots: { index: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUserPage(`/book/${slug}?${new URLSearchParams(sp as Record<string, string>).toString()}`);
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();
  if (!sp.checkIn || !sp.checkOut || !isIsoDate(sp.checkIn) || !isIsoDate(sp.checkOut)) redirect(`/properties/${slug}`);

  const stay = {
    checkIn: sp.checkIn,
    checkOut: sp.checkOut,
    adults: Math.max(1, Number.parseInt(sp.adults ?? "1", 10) || 1),
    children: Math.max(0, Number.parseInt(sp.children ?? "0", 10) || 0),
    infants: Math.max(0, Number.parseInt(sp.infants ?? "0", 10) || 0),
  };
  const settings = await getSettings();
  let quote: Awaited<ReturnType<typeof quoteStay>> | null = null;
  let problem: string | null = null;
  try {
    quote = await quoteStay(property.id, stay);
    if (!quote.available) problem = "Sorry — those dates are no longer available.";
  } catch (error) {
    problem = isAppError(error) ? error.message : "We couldn't prepare this booking.";
  }
  const policy = CANCELLATION_POLICY_COPY[property.cancellationPolicy];
  const back = `/properties/${slug}?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=${stay.adults + stay.children}`;

  return (
    <div className="container-page max-w-5xl pb-16 pt-6 sm:pt-10">
      <Link href={back} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-700 hover:text-ink-950">
        <ChevronLeft className="size-4" /> Back to {property.name}
      </Link>
      <h1 className="mt-4 text-h1 font-bold">Confirm and book</h1>

      {problem || !quote ? (
        <div className="mt-8 max-w-xl space-y-4">
          <Alert tone="warning" title="These dates can't be booked">{problem}</Alert>
          <ButtonLink href={`/properties/${slug}`} variant="brand">Choose other dates</ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="order-2 space-y-8 lg:order-1">
            <section>
              <h2 className="text-h3 font-semibold">Your stay</h2>
              <dl className="mt-4 divide-y divide-ink-100 rounded-xl ring-1 ring-ink-200">
                <div className="flex justify-between gap-4 p-4">
                  <dt className="text-ink-600">Dates</dt>
                  <dd className="text-right font-medium">{formatDateRange(stay.checkIn, stay.checkOut)} · {pluralize(quote.nights, "night")}</dd>
                </div>
                <div className="flex justify-between gap-4 p-4">
                  <dt className="text-ink-600">Guests</dt>
                  <dd className="text-right font-medium">
                    {pluralize(stay.adults, "adult")}
                    {stay.children ? `, ${pluralize(stay.children, "child", "children")}` : ""}
                    {stay.infants ? `, ${pluralize(stay.infants, "infant")}` : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 p-4">
                  <dt className="text-ink-600">Check-in / out</dt>
                  <dd className="text-right font-medium">After {property.checkInTime} · Before {property.checkOutTime}</dd>
                </div>
              </dl>
              <Link href={back} className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">Change dates or guests</Link>
            </section>

            <CheckoutForm
              propertyId={property.id}
              stay={stay}
              expectedTotal={quote.quote.total}
              user={{ name: user.name, email: user.email, phone: user.phone }}
              holdHours={settings.bookingHoldHours}
            />

            <section className="space-y-3 text-sm text-ink-600">
              <p className="flex gap-2">
                <ShieldCheck className="size-4 shrink-0 text-lagoon-700" aria-hidden />
                <span><strong className="text-ink-900">{policy.label} cancellation.</strong> {policy.summary}</span>
              </p>
              <p>
                How it works: we hold these dates for you for {settings.bookingHoldHours} hours while our team confirms your booking and shares payment details
                (M-Pesa, bank transfer or card). No payment is taken on this page.
              </p>
            </section>
          </div>

          <aside className="order-1 lg:order-2">
            <Card className="lg:sticky lg:top-24">
              <div className="flex gap-4">
                <ResponsiveImage image={property.images[0]} alt="" sizes="112px" className="aspect-square w-24 shrink-0 rounded-lg sm:w-28" />
                <div className="min-w-0">
                  <p className="text-sm text-ink-500">{property.destination?.name}</p>
                  <p className="font-semibold leading-snug">{property.name}</p>
                  <RatingInline value={property.ratingAverage?.toString()} count={property.reviewCount} className="mt-1" />
                </div>
              </div>
              <dl className="mt-6 space-y-2.5 border-t border-ink-200 pt-5 text-[0.9375rem]">
                <div className="flex justify-between">
                  <dt className="text-ink-700">{formatMoney(quote.quote.nightlyRate, quote.currency)} × {pluralize(quote.nights, "night")}</dt>
                  <dd className="tabular-nums">{formatMoney(quote.quote.subtotal, quote.currency)}</dd>
                </div>
                {quote.quote.discountAmount > 0 && (
                  <div className="flex justify-between text-success-700">
                    <dt>{quote.quote.offer?.title ?? "Discount"}</dt>
                    <dd className="tabular-nums">−{formatMoney(quote.quote.discountAmount, quote.currency)}</dd>
                  </div>
                )}
                {quote.quote.cleaningFee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-ink-700">Cleaning fee</dt>
                    <dd className="tabular-nums">{formatMoney(quote.quote.cleaningFee, quote.currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-semibold">
                  <dt>Total ({quote.currency})</dt>
                  <dd className="tabular-nums">{formatMoney(quote.quote.total, quote.currency)}</dd>
                </div>
              </dl>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
