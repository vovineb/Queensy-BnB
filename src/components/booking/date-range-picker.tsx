"use client";

import { useMemo } from "react";
import { DayPicker, type Matcher } from "react-day-picker";
import "react-day-picker/style.css";
import { addDays, parseIsoDate, toIsoDate } from "@/lib/dates";
import { useMediaQuery } from "@/hooks/use-media-query";

export type DateRangeValue = { from?: string; to?: string };
export type UnavailableRange = { start: string; end: string };

// DayPicker works in local time; we convert to/from ISO calendar dates at the edges.
const toLocal = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fromLocal = (date: Date) => toIsoDate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));

/**
 * Stay date picker. Knows which nights are unavailable, allows checking out on
 * the morning another stay starts, and enforces minimum/maximum nights.
 */
export function DateRangePicker({
  value,
  onChange,
  unavailable = [],
  today,
  lastDate,
  minNights = 1,
  maxNights,
  months,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  unavailable?: UnavailableRange[];
  today: string;
  lastDate?: string;
  minNights?: number;
  maxNights?: number | null;
  months?: number;
}) {
  const wide = useMediaQuery("(min-width: 768px)");
  const numberOfMonths = months ?? (wide ? 2 : 1);

  const blocked = useMemo(() => unavailable.map((r) => ({ start: parseIsoDate(r.start), end: parseIsoDate(r.end) })), [unavailable]);
  const nightBlocked = (iso: string) => {
    const d = parseIsoDate(iso);
    return blocked.some((r) => d >= r.start && d < r.end);
  };
  const nextBlockedStart = (fromIso: string) => {
    const from = parseIsoDate(fromIso);
    const starts = blocked.filter((r) => r.start > from).map((r) => r.start.getTime());
    return starts.length ? toIsoDate(new Date(Math.min(...starts))) : undefined;
  };

  const validCheckIn = (iso: string) => iso >= today && (!lastDate || iso <= lastDate) && !nightBlocked(iso);
  const validCheckOut = (fromIso: string, iso: string) => {
    if (iso <= fromIso) return false;
    const min = toIsoDate(addDays(parseIsoDate(fromIso), minNights));
    if (iso < min) return false;
    if (maxNights && iso > toIsoDate(addDays(parseIsoDate(fromIso), maxNights))) return false;
    const limit = nextBlockedStart(fromIso);
    return !limit || iso <= limit;
  };

  const choosingCheckout = Boolean(value.from && !value.to);
  const disabled: Matcher = (date: Date) => {
    const iso = fromLocal(date);
    if (choosingCheckout && value.from) return !(validCheckOut(value.from, iso) || validCheckIn(iso));
    return !validCheckIn(iso);
  };

  const handleDayClick = (date: Date) => {
    const iso = fromLocal(date);
    if (!value.from || value.to) {
      if (validCheckIn(iso)) onChange({ from: iso, to: undefined });
      return;
    }
    if (validCheckOut(value.from, iso)) onChange({ from: value.from, to: iso });
    else if (validCheckIn(iso)) onChange({ from: iso, to: undefined });
  };

  const from = value.from ? toLocal(value.from) : undefined;
  const to = value.to ? toLocal(value.to) : undefined;
  const modifiers = {
    booked: (date: Date) => nightBlocked(fromLocal(date)),
    checkout_only: (date: Date) => {
      const iso = fromLocal(date);
      return nightBlocked(iso) && !!value.from && !value.to && validCheckOut(value.from, iso);
    },
    selected: (date: Date) => Boolean(from && (to ? date >= from && date <= to : +date === +from)),
    range_start: (date: Date) => Boolean(from && +date === +from),
    range_end: (date: Date) => Boolean(to && +date === +to),
    range_middle: (date: Date) => Boolean(from && to && date > from && date < to),
  };

  return (
    <div>
      <DayPicker
        numberOfMonths={numberOfMonths}
        defaultMonth={from ?? toLocal(today)}
        startMonth={toLocal(today)}
        endMonth={lastDate ? toLocal(lastDate) : undefined}
        disabled={disabled}
        modifiers={modifiers}
        modifiersClassNames={{ booked: "rdp-booked", checkout_only: "rdp-checkout_only" }}
        onDayClick={handleDayClick}
        weekStartsOn={1}
        showOutsideDays={false}
      />
      <p className="mt-2 text-xs text-ink-500" aria-live="polite">
        {!value.from ? "Select your check-in date." : !value.to ? `Now select check-out${minNights > 1 ? ` (minimum ${minNights} nights)` : ""}.` : "Tap a date to start over."}
        {unavailable.length > 0 && " Crossed-out dates are unavailable."}
      </p>
    </div>
  );
}
