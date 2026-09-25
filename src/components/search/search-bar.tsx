"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics-client";
import { DateRangePicker, type DateRangeValue } from "@/components/booking/date-range-picker";
import { GuestSelector, guestSummary, type Guests } from "@/components/booking/guest-selector";

export type SearchDefaults = { destination?: string; q?: string; checkIn?: string; checkOut?: string; guests?: number };

type Props = {
  destinations: { slug: string; name: string }[];
  today: string;
  defaults?: SearchDefaults;
  variant?: "hero" | "compact";
  className?: string;
};

function Segment({ icon, label, value, placeholder, className }: { icon: ReactNode; label: string; value?: string; placeholder: string; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3 text-left", className)}>
      <span className="text-ink-500 [&_svg]:size-5">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-ink-900">{label}</span>
        <span className={cn("block truncate text-sm", value ? "text-ink-950" : "text-ink-500")}>{value || placeholder}</span>
      </span>
    </span>
  );
}

const popoverCls = "z-50 rounded-2xl bg-surface p-4 shadow-float ring-1 ring-ink-200/70 focus:outline-none sm:p-5";

export function SearchBar({ destinations, today, defaults = {}, variant = "hero", className }: Props) {
  const router = useRouter();
  const [where, setWhere] = useState(defaults.destination ?? defaults.q ?? "");
  const [dates, setDates] = useState<DateRangeValue>({ from: defaults.checkIn, to: defaults.checkOut });
  const [guests, setGuests] = useState<Guests>({ adults: Math.max(1, defaults.guests ?? 2), children: 0, infants: 0 });
  const [open, setOpen] = useState<"dates" | "guests" | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const match = destinations.find((d) => d.slug === where || d.name.toLowerCase() === where.trim().toLowerCase());
    if (match) params.set("destination", match.slug);
    else if (where.trim()) params.set("q", where.trim());
    if (dates.from && dates.to) {
      params.set("checkIn", dates.from);
      params.set("checkOut", dates.to);
    }
    params.set("guests", String(guests.adults + guests.children));
    trackEvent("search", { props: { destination: match?.slug ?? null, hasDates: Boolean(dates.from && dates.to), guests: guests.adults + guests.children } });
    router.push(`/properties?${params.toString()}`);
  };

  const dateLabel =
    dates.from && dates.to
      ? `${formatDate(dates.from, { day: "numeric", month: "short" })} – ${formatDate(dates.to, { day: "numeric", month: "short" })}`
      : dates.from
        ? `${formatDate(dates.from, { day: "numeric", month: "short" })} – ?`
        : undefined;

  const compact = variant === "compact";

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Search stays"
      className={cn(
        "grid w-full gap-1 rounded-2xl bg-surface p-2 shadow-float ring-1 ring-ink-200/70",
        compact ? "md:grid-cols-[1.3fr_1.2fr_1fr_auto] md:rounded-full" : "md:grid-cols-[1.4fr_1.3fr_1fr_auto] md:rounded-full md:p-2.5",
        className,
      )}
    >
      <label className="group flex min-h-14 items-center gap-3 rounded-xl px-4 py-2 focus-within:bg-ink-50 hover:bg-ink-50 md:rounded-full">
        <MapPin className="size-5 shrink-0 text-ink-500" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-ink-900">Where</span>
          <input
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            list="qb-destinations"
            placeholder="Search destinations or stays"
            className="w-full bg-transparent text-sm text-ink-950 placeholder:text-ink-500 focus:outline-none"
            aria-label="Destination or property name"
          />
          <datalist id="qb-destinations">
            {destinations.map((d) => (
              <option key={d.slug} value={d.name} />
            ))}
          </datalist>
        </span>
      </label>

      <Popover.Root open={open === "dates"} onOpenChange={(o) => setOpen(o ? "dates" : null)}>
        <Popover.Trigger className="flex min-h-14 items-center rounded-xl px-4 py-2 hover:bg-ink-50 data-[state=open]:bg-ink-50 md:rounded-full" aria-label="Choose dates">
          <Segment icon={<CalendarDays />} label="Dates" value={dateLabel} placeholder="Add dates" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="center" sideOffset={10} collisionPadding={12} className={popoverCls}>
            <DateRangePicker value={dates} onChange={(v) => { setDates(v); if (v.from && v.to) setOpen("guests"); }} today={today} />
            <div className="mt-3 flex justify-between gap-2 border-t border-ink-100 pt-3">
              <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => setDates({})}>
                Clear dates
              </button>
              <button type="button" className="rounded-md bg-ink-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => setOpen(null)}>
                Done
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root open={open === "guests"} onOpenChange={(o) => setOpen(o ? "guests" : null)}>
        <Popover.Trigger className="flex min-h-14 items-center rounded-xl px-4 py-2 hover:bg-ink-50 data-[state=open]:bg-ink-50 md:rounded-full" aria-label="Choose guests">
          <Segment icon={<Users />} label="Guests" value={guestSummary(guests)} placeholder="Add guests" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="end" sideOffset={10} collisionPadding={12} className={cn(popoverCls, "w-[min(92vw,360px)]")}>
            <GuestSelector value={guests} onChange={setGuests} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <button type="submit" className="flex h-14 items-center justify-center gap-2 rounded-xl bg-sunset-600 px-6 font-semibold text-white transition-colors hover:bg-sunset-700 active:scale-[0.98] md:h-auto md:rounded-full">
        <Search className="size-5" aria-hidden />
        <span className={cn(compact && "md:sr-only lg:not-sr-only")}>Search</span>
      </button>
    </form>
  );
}
