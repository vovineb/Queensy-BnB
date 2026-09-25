import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/server/db";
import { ACTIVE_BOOKING_STATUSES, today } from "@/server/services/availability";
import { addDays, toIsoDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Calendar" };

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-warning-50 text-warning-700 ring-warning-600/30",
  AWAITING_PAYMENT: "bg-sunset-50 text-sunset-700 ring-sunset-600/30",
  PAID: "bg-lagoon-100 text-lagoon-900 ring-lagoon-600/30",
  CONFIRMED: "bg-lagoon-100 text-lagoon-900 ring-lagoon-600/30",
  COMPLETED: "bg-ink-100 text-ink-700 ring-ink-300",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const t = today();
  const [y, m] = /^\d{4}-\d{2}$/.test(month ?? "") ? month!.split("-").map(Number) : [t.getUTCFullYear(), t.getUTCMonth() + 1];
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const prev = toIsoDate(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7);
  const next = toIsoDate(new Date(Date.UTC(y, m, 1))).slice(0, 7);

  const properties = await db.property.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true,
      bookings: { where: { status: { in: ACTIVE_BOOKING_STATUSES }, checkIn: { lt: end }, checkOut: { gt: start } }, select: { id: true, reference: true, guestName: true, checkIn: true, checkOut: true, status: true } },
      availabilityBlocks: { where: { startDate: { lt: end }, endDate: { gt: start } }, select: { id: true, startDate: true, endDate: true, reason: true } },
    },
  });
  const label = new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
  const dayList = Array.from({ length: days }, (_, i) => addDays(start, i));
  const col = (d: Date) => Math.max(0, Math.round((d.getTime() - start.getTime()) / 86_400_000));

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Every property at a glance. Click a booking to manage it."
        actions={
          <div className="flex items-center gap-1">
            <Link href={`?month=${prev}`} className="grid size-9 place-items-center rounded-md ring-1 ring-ink-200 hover:bg-surface" aria-label="Previous month"><ChevronLeft className="size-4" /></Link>
            <span className="w-36 text-center text-sm font-semibold">{label}</span>
            <Link href={`?month=${next}`} className="grid size-9 place-items-center rounded-md ring-1 ring-ink-200 hover:bg-surface" aria-label="Next month"><ChevronRight className="size-4" /></Link>
          </div>
        }
      />
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-600">
        {[["Awaiting confirmation", "PENDING"], ["Awaiting payment", "AWAITING_PAYMENT"], ["Confirmed / paid", "CONFIRMED"], ["Completed", "COMPLETED"]].map(([l, s]) => (
          <span key={s} className="flex items-center gap-1.5"><span className={cn("size-3 rounded ring-1", STATUS_CLS[s])} /> {l}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-[repeating-linear-gradient(135deg,var(--color-ink-200)_0_3px,transparent_3px_6px)] ring-1 ring-ink-300" /> Blocked</span>
      </div>
      <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-ink-200">
        <div className="min-w-[900px]" style={{ display: "grid", gridTemplateColumns: `180px repeat(${days}, minmax(28px, 1fr))` }}>
          <div className="sticky left-0 z-10 border-b border-ink-200 bg-surface" />
          {dayList.map((d) => {
            const isToday = +d === +t;
            const weekend = [0, 6].includes(d.getUTCDay());
            return (
              <div key={d.toISOString()} className={cn("border-b border-l border-ink-100 py-2 text-center text-[0.6875rem]", weekend && "bg-ink-50", isToday && "bg-sunset-50 font-bold text-sunset-700")}>
                <div className="text-ink-400">{new Intl.DateTimeFormat("en", { weekday: "narrow", timeZone: "UTC" }).format(d)}</div>
                {d.getUTCDate()}
              </div>
            );
          })}
          {properties.map((p) => (
            <div key={p.id} className="contents">
              <div className="sticky left-0 z-10 flex items-center border-b border-ink-100 bg-surface px-3 py-3 text-sm font-medium">
                <Link href={`/admin/properties/${p.id}?tab=availability`} className="truncate hover:underline">{p.name}</Link>
              </div>
              <div className="relative border-b border-ink-100" style={{ gridColumn: `2 / span ${days}`, display: "grid", gridTemplateColumns: `repeat(${days}, minmax(28px, 1fr))` }}>
                {dayList.map((d) => <div key={d.toISOString()} className={cn("border-l border-ink-100", [0, 6].includes(d.getUTCDay()) && "bg-ink-50/60")} />)}
                {p.availabilityBlocks.map((b) => (
                  <div key={b.id} title={`Blocked${b.reason ? `: ${b.reason}` : ""}`} className="absolute inset-y-2 rounded-md bg-[repeating-linear-gradient(135deg,var(--color-ink-200)_0_3px,transparent_3px_6px)] ring-1 ring-ink-300"
                    style={{ left: `calc(${(col(b.startDate) / days) * 100}% + 2px)`, width: `calc(${((col(b.endDate > end ? end : b.endDate) - col(b.startDate)) / days) * 100}% - 4px)` }} />
                ))}
                {p.bookings.map((b) => {
                  // Bars run from midday check-in to midday check-out, clipped to the month.
                  const left = b.checkIn < start ? 0 : col(b.checkIn) + 0.5;
                  const right = b.checkOut > end ? days : col(b.checkOut) + 0.5;
                  return (
                    <Link key={b.id} href={`/admin/bookings/${b.id}`} title={`${b.reference} · ${b.guestName}`}
                      className={cn("absolute inset-y-2 flex items-center truncate rounded-md px-2 text-xs font-medium ring-1 hover:brightness-95", STATUS_CLS[b.status])}
                      style={{ left: `calc(${(left / days) * 100}% + 1px)`, width: `calc(${((Math.min(right, days) - left) / days) * 100}% - 2px)` }}>
                      {b.guestName.split(" ")[0]}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {properties.length === 0 && <p className="mt-4 text-sm text-ink-500">No properties yet.</p>}
    </>
  );
}
