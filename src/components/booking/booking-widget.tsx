"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { CalendarDays, ChevronDown, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/format";
import { nightsBetween, parseIsoDate } from "@/lib/dates";
import { trackEvent } from "@/lib/analytics-client";
import { useRealtime } from "@/hooks/use-realtime";
import { Drawer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateRangePicker, type DateRangeValue, type UnavailableRange } from "./date-range-picker";
import { GuestSelector, guestSummary, type Guests } from "./guest-selector";

type Calendar = { today: string; lastDate: string; unavailable: UnavailableRange[]; minNights: number; maxNights: number | null };
type QuoteResponse = {
  available: boolean;
  currency: string;
  nights: number;
  quote: { nightlyRate: number; subtotal: number; discountAmount: number; cleaningFee: number; total: number; offer: { title: string } | null };
};

type Props = {
  property: { id: string; slug: string; basePrice: number; currency: string; maxGuests: number; minNights: number; maxNights: number | null };
  initial: { checkIn?: string; checkOut?: string; guests?: number };
  today: string;
};

async function fetchCalendar(propertyId: string): Promise<Calendar | null> {
  try {
    const res = await fetch(`/api/availability/${propertyId}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as Calendar) : null;
  } catch {
    return null;
  }
}

function rangeIsFree(unavailable: UnavailableRange[], from: string, to: string) {
  return !unavailable.some((r) => from < r.end && r.start < to);
}

/** Reservation panel: live calendar, guests, server quote, and handoff to checkout. */
export function useBookingState({ property, initial, today }: Props) {
  const router = useRouter();
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [calendarError, setCalendarError] = useState(false);
  const [dates, setDates] = useState<DateRangeValue>({ from: initial.checkIn, to: initial.checkOut });
  const [guests, setGuests] = useState<Guests>({ adults: Math.min(Math.max(1, initial.guests ?? 1), property.maxGuests), children: 0, infants: 0 });
  // Quote results are keyed by the request they answer, so stale responses are
  // ignored and "loading" is derived rather than toggled inside effects.
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; quote: QuoteResponse | null; error: string | null } | null>(null);

  const applyCalendar = useCallback((next: Calendar | null) => {
    if (next) {
      setCalendar(next);
      setCalendarError(false);
      setCalendarVersion((v) => v + 1);
    } else setCalendarError(true);
  }, []);
  const loadCalendar = useCallback(() => fetchCalendar(property.id).then(applyCalendar), [property.id, applyCalendar]);

  useEffect(() => {
    let alive = true;
    fetchCalendar(property.id).then((c) => alive && applyCalendar(c));
    return () => {
      alive = false;
    };
  }, [property.id, applyCalendar]);

  // Live availability: another guest booking these dates updates this calendar instantly.
  useRealtime([`availability:${property.id}`], () => void loadCalendar(), { onReconnect: () => void loadCalendar() });

  const complete = Boolean(dates.from && dates.to);
  const requestKey = complete ? [dates.from, dates.to, guests.adults, guests.children, guests.infants, calendarVersion].join("|") : null;

  useEffect(() => {
    if (!requestKey || !dates.from || !dates.to) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ propertyId: property.id, checkIn: dates.from, checkOut: dates.to, adults: String(guests.adults), children: String(guests.children), infants: String(guests.infants) });
    fetch(`/api/quote?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) setResult({ key: requestKey, quote: null, error: body.error ?? "Those dates can't be booked." });
        else setResult({ key: requestKey, quote: body, error: body.available ? null : "Those dates are no longer available." });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setResult({ key: requestKey, quote: null, error: "Couldn't get a price. Check your connection and try again." });
      });
    return () => controller.abort();
  }, [requestKey, dates.from, dates.to, guests.adults, guests.children, guests.infants, property.id]);

  const current = result && result.key === requestKey ? result : null;
  const quoting = complete && !current;
  const quote = complete ? (current?.quote ?? (quoting ? (result?.quote ?? null) : null)) : null;
  const selectionTaken = Boolean(calendar && dates.from && dates.to && !rangeIsFree(calendar.unavailable, dates.from, dates.to));
  const quoteError = !complete ? null : selectionTaken ? "Those dates were just booked by someone else. Please choose new dates." : (current?.error ?? null);

  const reserve = () => {
    if (!dates.from || !dates.to || !quote?.available) return;
    const params = new URLSearchParams({ checkIn: dates.from, checkOut: dates.to, adults: String(guests.adults), children: String(guests.children), infants: String(guests.infants) });
    trackEvent("booking_started", { propertyId: property.id, props: { nights: quote.nights } });
    router.push(`/book/${property.slug}?${params}`);
  };

  return { calendar, calendarError, loadCalendar, dates, setDates, guests, setGuests, quote, quoteError, quoting, complete, reserve, today };
}

type State = ReturnType<typeof useBookingState>;

function QuoteBreakdown({ state, currency }: { state: State; currency: string }) {
  const { quote, quoting, quoteError } = state;
  return (
    <AnimatePresence mode="wait" initial={false}>
      {quoteError ? (
        <m.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-md bg-danger-50 p-3 text-sm text-danger-700" role="alert">
          {quoteError}
        </m.p>
      ) : quoting && !quote ? (
        <m.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Checking availability…
        </m.div>
      ) : quote ? (
        <m.dl key="quote" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("space-y-2.5 text-[0.9375rem]", quoting && "opacity-60")}>
          <div className="flex justify-between">
            <dt className="text-ink-700">
              {formatMoney(quote.quote.nightlyRate, currency)} × {quote.nights} night{quote.nights === 1 ? "" : "s"}
            </dt>
            <dd className="tabular-nums">{formatMoney(quote.quote.subtotal, currency)}</dd>
          </div>
          {quote.quote.discountAmount > 0 && (
            <div className="flex justify-between text-success-700">
              <dt>{quote.quote.offer?.title ?? "Discount"}</dt>
              <dd className="tabular-nums">−{formatMoney(quote.quote.discountAmount, currency)}</dd>
            </div>
          )}
          {quote.quote.cleaningFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-700">Cleaning fee</dt>
              <dd className="tabular-nums">{formatMoney(quote.quote.cleaningFee, currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-ink-200 pt-3 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(quote.quote.total, currency)}</dd>
          </div>
        </m.dl>
      ) : null}
    </AnimatePresence>
  );
}

function Fields({ state, property, onOpenDates, onOpenGuests }: { state: State; property: Props["property"]; onOpenDates: () => void; onOpenGuests: () => void }) {
  const { dates, guests } = state;
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-ink-300">
      <button type="button" onClick={onOpenDates} className="grid w-full grid-cols-2 text-left hover:bg-ink-50">
        <span className="border-r border-ink-300 px-3.5 py-2.5">
          <span className="block text-[0.6875rem] font-bold uppercase tracking-wide text-ink-900">Check-in</span>
          <span className={cn("block text-sm", dates.from ? "text-ink-950" : "text-ink-500")}>{dates.from ? formatDate(dates.from) : "Add date"}</span>
        </span>
        <span className="px-3.5 py-2.5">
          <span className="block text-[0.6875rem] font-bold uppercase tracking-wide text-ink-900">Check-out</span>
          <span className={cn("block text-sm", dates.to ? "text-ink-950" : "text-ink-500")}>{dates.to ? formatDate(dates.to) : "Add date"}</span>
        </span>
      </button>
      <button type="button" onClick={onOpenGuests} className="flex w-full items-center justify-between border-t border-ink-300 px-3.5 py-2.5 text-left hover:bg-ink-50">
        <span>
          <span className="block text-[0.6875rem] font-bold uppercase tracking-wide text-ink-900">Guests</span>
          <span className="block text-sm">{guestSummary(guests)}</span>
        </span>
        <ChevronDown className="size-4 text-ink-500" aria-hidden />
      </button>
      <span className="sr-only">Up to {property.maxGuests} guests</span>
    </div>
  );
}

function CalendarPanel({ state, property }: { state: State; property: Props["property"] }) {
  if (state.calendarError)
    return (
      <p className="text-sm text-danger-700">
        Couldn&apos;t load availability.{" "}
        <button type="button" className="font-semibold underline" onClick={() => void state.loadCalendar()}>
          Try again
        </button>
      </p>
    );
  if (!state.calendar) return <div className="skeleton h-[340px] rounded-lg" aria-label="Loading availability" />;
  return (
    <DateRangePicker
      value={state.dates}
      onChange={state.setDates}
      unavailable={state.calendar.unavailable}
      today={state.calendar.today}
      lastDate={state.calendar.lastDate}
      minNights={property.minNights}
      maxNights={property.maxNights}
    />
  );
}

export function BookingWidget(props: Props) {
  const state = useBookingState(props);
  const { property } = props;
  const [panel, setPanel] = useState<"dates" | "guests" | null>(null);
  const nights = state.dates.from && state.dates.to ? nightsBetween(parseIsoDate(state.dates.from), parseIsoDate(state.dates.to)) : 0;

  return (
    <>
      {/* Desktop sidebar card */}
      <div className="hidden lg:block">
        <div className="rounded-2xl bg-surface p-6 shadow-float ring-1 ring-ink-200/70">
          <p className="mb-5 text-xl">
            <span className="font-semibold tabular-nums">{formatMoney(state.quote && nights ? Math.round(state.quote.quote.total / nights) : property.basePrice, property.currency)}</span>
            <span className="text-base text-ink-600"> / night{state.quote?.quote.discountAmount ? " avg." : ""}</span>
          </p>
          <Fields state={state} property={property} onOpenDates={() => setPanel(panel === "dates" ? null : "dates")} onOpenGuests={() => setPanel(panel === "guests" ? null : "guests")} />
          <AnimatePresence initial={false}>
            {panel && (
              <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                <div className="pt-4">
                  {panel === "dates" ? <CalendarPanel state={state} property={property} /> : <GuestSelector value={state.guests} onChange={state.setGuests} maxGuests={property.maxGuests} />}
                  <button type="button" onClick={() => setPanel(null)} className="mt-2 text-sm font-semibold underline underline-offset-4">
                    Close
                  </button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
          <Button variant="primary" size="lg" className="mt-4 w-full" disabled={state.complete && !state.quote?.available} loading={state.quoting && state.complete} onClick={() => (state.complete ? state.reserve() : setPanel("dates"))}>
            {state.complete ? "Reserve" : "Check availability"}
          </Button>
          {state.complete && state.quote?.available && <p className="mt-2 text-center text-sm text-ink-500">You won&apos;t be charged yet</p>}
          <div className="mt-5">
            <QuoteBreakdown state={state} currency={property.currency} />
          </div>
        </div>
      </div>

      {/* Mobile sticky bar + drawer */}
      <MobileBookingBar state={state} property={property} nights={nights} />
    </>
  );
}

function MobileBookingBar({ state, property, nights }: { state: State; property: Props["property"]; nights: number }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"dates" | "guests">("dates");
  const summary = useMemo(() => {
    if (state.dates.from && state.dates.to) return `${formatDate(state.dates.from, { day: "numeric", month: "short" })} – ${formatDate(state.dates.to, { day: "numeric", month: "short" })}`;
    return "Add dates for prices";
  }, [state.dates]);

  return (
    <>
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-surface/95 px-4 pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button type="button" onClick={() => { setTab("dates"); setOpen(true); }} className="min-w-0 text-left">
            <span className="block font-semibold tabular-nums">
              {state.quote && nights ? formatMoney(state.quote.quote.total, property.currency) : formatMoney(property.basePrice, property.currency)}
              <span className="font-normal text-ink-600">{state.quote && nights ? " total" : " / night"}</span>
            </span>
            <span className="block truncate text-sm text-ink-600 underline underline-offset-2">{summary}</span>
          </button>
          <Button
            variant="primary"
            size="lg"
            className="shrink-0"
            disabled={state.complete && !state.quote?.available}
            onClick={() => (state.complete && state.quote?.available ? state.reserve() : (setTab("dates"), setOpen(true)))}
          >
            {state.complete && state.quote?.available ? "Reserve" : "Check dates"}
          </Button>
        </div>
      </div>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={tab === "dates" ? "Select dates" : "Who's coming?"}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => (tab === "dates" ? state.setDates({}) : setTab("dates"))}>
              {tab === "dates" ? "Clear" : "Back to dates"}
            </button>
            {tab === "dates" ? (
              <Button variant="dark" disabled={!state.complete} onClick={() => setTab("guests")}>
                Next
              </Button>
            ) : (
              <Button variant="primary" disabled={!state.quote?.available} loading={state.quoting} onClick={state.reserve}>
                Reserve
              </Button>
            )}
          </div>
        }
      >
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setTab("dates")} className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium ring-1", tab === "dates" ? "bg-ink-900 text-white ring-ink-900" : "ring-ink-200")}>
            <CalendarDays className="size-4" /> Dates
          </button>
          <button type="button" onClick={() => setTab("guests")} className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium ring-1", tab === "guests" ? "bg-ink-900 text-white ring-ink-900" : "ring-ink-200")}>
            <Users className="size-4" /> {guestSummary(state.guests)}
          </button>
        </div>
        {tab === "dates" ? <CalendarPanel state={state} property={property} /> : <GuestSelector value={state.guests} onChange={state.setGuests} maxGuests={property.maxGuests} />}
        <div className="mt-5">
          <QuoteBreakdown state={state} currency={property.currency} />
        </div>
      </Drawer>
    </>
  );
}

