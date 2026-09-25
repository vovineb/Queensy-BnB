"use client";

import { Minus, Plus } from "lucide-react";

export type Guests = { adults: number; children: number; infants: number };

const ROWS: { key: keyof Guests; label: string; hint: string; min: number }[] = [
  { key: "adults", label: "Adults", hint: "Ages 13 or above", min: 1 },
  { key: "children", label: "Children", hint: "Ages 2–12", min: 0 },
  { key: "infants", label: "Infants", hint: "Under 2 — don't count toward capacity", min: 0 },
];

export function guestSummary(g: Guests) {
  const guests = g.adults + g.children;
  const parts = [`${guests} guest${guests === 1 ? "" : "s"}`];
  if (g.infants) parts.push(`${g.infants} infant${g.infants === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function GuestSelector({ value, onChange, maxGuests = 16 }: { value: Guests; onChange: (g: Guests) => void; maxGuests?: number }) {
  const total = value.adults + value.children;
  return (
    <div className="divide-y divide-ink-100">
      {ROWS.map((row) => {
        const current = value[row.key];
        const canAdd = row.key === "infants" ? current < 5 : total < maxGuests;
        return (
          <div key={row.key} className="flex items-center justify-between gap-6 py-3.5">
            <div>
              <p className="font-medium text-ink-900">{row.label}</p>
              <p className="text-sm text-ink-500">{row.hint}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange({ ...value, [row.key]: current - 1 })}
                disabled={current <= row.min}
                className="grid size-9 place-items-center rounded-full ring-1 ring-ink-300 text-ink-700 hover:ring-ink-900 disabled:opacity-30"
                aria-label={`Fewer ${row.label.toLowerCase()}`}
              >
                <Minus className="size-4" />
              </button>
              <span className="w-5 text-center font-medium tabular-nums" aria-live="polite" aria-label={`${current} ${row.label.toLowerCase()}`}>
                {current}
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...value, [row.key]: current + 1 })}
                disabled={!canAdd}
                className="grid size-9 place-items-center rounded-full ring-1 ring-ink-300 text-ink-700 hover:ring-ink-900 disabled:opacity-30"
                aria-label={`More ${row.label.toLowerCase()}`}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
      {total >= maxGuests && <p className="pt-3 text-sm text-ink-500">This place fits up to {maxGuests} guests.</p>}
    </div>
  );
}
