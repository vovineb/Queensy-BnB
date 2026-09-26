import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ResponsiveImage } from "@/components/ui/image";
import { BookingStatusBadge } from "@/components/ui/status-badge";
import { formatDateRange, formatMoney } from "@/lib/format";

type Booking = {
  reference: string;
  status: string;
  checkIn: Date;
  checkOut: Date;
  total: number;
  currency: string;
  property: { name: string; destination: { name: string } | null; images: { url: string; storageKey: string | null; alt: string }[] };
};

export function BookingRow({ booking }: { booking: Booking }) {
  return (
    <Link href={`/account/bookings/${booking.reference}`} className="group flex items-center gap-4 rounded-xl bg-surface p-3 ring-1 ring-ink-200/70 transition hover:shadow-card sm:p-4">
      <ResponsiveImage image={booking.property.images[0]} alt="" sizes="96px" className="aspect-square w-20 shrink-0 rounded-lg sm:w-24" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <span className="text-xs text-ink-500">{booking.reference}</span>
        </div>
        <p className="mt-1.5 truncate font-semibold">{booking.property.name}</p>
        <p className="text-sm text-ink-600">
          {formatDateRange(booking.checkIn, booking.checkOut)}
          {booking.property.destination ? ` · ${booking.property.destination.name}` : ""}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-semibold tabular-nums">{formatMoney(booking.total, booking.currency)}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-400 transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
