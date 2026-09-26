"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatMoney, fromMinorUnits } from "@/lib/format";
import { trackEvent } from "@/lib/analytics-client";

export type Facets = {
  types: { value: string; count: number }[];
  amenities: { slug: string; name: string; category: string }[];
  destinations: { slug: string; name: string }[];
  minPrice: number;
  maxPrice: number;
  maxBedrooms: number;
  maxBathrooms: number;
  currency: string;
};

type FilterState = {
  type: string[];
  amenities: string[];
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  rating: string;
  offers: boolean;
};

const FILTER_KEYS = ["type", "amenities", "minPrice", "maxPrice", "bedrooms", "bathrooms", "rating", "offers"] as const;

function readState(params: URLSearchParams): FilterState {
  return {
    type: params.get("type")?.split(",").filter(Boolean) ?? [],
    amenities: params.get("amenities")?.split(",").filter(Boolean) ?? [],
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    bedrooms: params.get("bedrooms") ?? "",
    bathrooms: params.get("bathrooms") ?? "",
    rating: params.get("rating") ?? "",
    offers: params.get("offers") === "1",
  };
}

export function activeFilterCount(params: URLSearchParams) {
  const s = readState(params);
  return s.type.length + s.amenities.length + (s.minPrice ? 1 : 0) + (s.maxPrice ? 1 : 0) + (s.bedrooms ? 1 : 0) + (s.bathrooms ? 1 : 0) + (s.rating ? 1 : 0) + (s.offers ? 1 : 0);
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("rounded-full px-3.5 py-2 text-sm font-medium ring-1 ring-inset transition", active ? "bg-ink-900 text-white ring-ink-900" : "bg-surface text-ink-800 ring-ink-200 hover:ring-ink-400")}
    >
      {children}
    </button>
  );
}

function Stepper({ label, value, onChange, max }: { label: string; value: string; onChange: (v: string) => void; max: number }) {
  const options = ["", ...Array.from({ length: Math.max(1, Math.min(max, 6)) }, (_, i) => String(i + 1))];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink-800">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o || "any"} active={value === o} onClick={() => onChange(o)}>
            {o ? `${o}+` : "Any"}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

function FilterFields({ facets, state, setState }: { facets: Facets; state: FilterState; setState: (s: FilterState) => void }) {
  const toggle = (key: "type" | "amenities", value: string) =>
    setState({ ...state, [key]: state[key].includes(value) ? state[key].filter((v) => v !== value) : [...state[key], value] });
  const minMajor = Math.floor(fromMinorUnits(facets.minPrice, facets.currency));
  const maxMajor = Math.ceil(fromMinorUnits(facets.maxPrice, facets.currency));

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink-800">Price per night ({facets.currency})</legend>
        <p className="mb-3 text-sm text-ink-500">
          Stays range from {formatMoney(facets.minPrice, facets.currency)} to {formatMoney(facets.maxPrice, facets.currency)}.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-ink-600">
            Minimum
            <input type="number" inputMode="numeric" min={0} placeholder={String(minMajor)} value={state.minPrice} onChange={(e) => setState({ ...state, minPrice: e.target.value })} className="mt-1 h-11 w-full rounded-md px-3 ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-lagoon-500" />
          </label>
          <label className="text-sm text-ink-600">
            Maximum
            <input type="number" inputMode="numeric" min={0} placeholder={String(maxMajor)} value={state.maxPrice} onChange={(e) => setState({ ...state, maxPrice: e.target.value })} className="mt-1 h-11 w-full rounded-md px-3 ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-lagoon-500" />
          </label>
        </div>
      </fieldset>

      {facets.types.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-800">Type of place</legend>
          <div className="flex flex-wrap gap-2">
            {facets.types.map((t) => (
              <Chip key={t.value} active={state.type.includes(t.value)} onClick={() => toggle("type", t.value)}>
                {PROPERTY_TYPE_LABELS[t.value] ?? t.value} <span className="opacity-60">({t.count})</span>
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      {facets.maxBedrooms > 1 && <Stepper label="Bedrooms" value={state.bedrooms} onChange={(v) => setState({ ...state, bedrooms: v })} max={facets.maxBedrooms} />}
      {facets.maxBathrooms > 1 && <Stepper label="Bathrooms" value={state.bathrooms} onChange={(v) => setState({ ...state, bathrooms: v })} max={facets.maxBathrooms} />}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-800">Guest rating</legend>
        <div className="flex flex-wrap gap-2">
          {["", "4", "3"].map((r) => (
            <Chip key={r || "any"} active={state.rating === r} onClick={() => setState({ ...state, rating: r })}>
              {r ? `${r}.0+` : "Any"}
            </Chip>
          ))}
        </div>
      </fieldset>

      {facets.amenities.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-800">Amenities</legend>
          <div className="flex flex-wrap gap-2">
            {facets.amenities.map((a) => (
              <Chip key={a.slug} active={state.amenities.includes(a.slug)} onClick={() => toggle("amenities", a.slug)}>
                {a.name}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex items-center justify-between gap-4 rounded-lg bg-ink-50 p-4">
        <span>
          <span className="block text-sm font-medium text-ink-900">Offers only</span>
          <span className="block text-sm text-ink-500">Show stays with an active discount</span>
        </span>
        <input type="checkbox" checked={state.offers} onChange={(e) => setState({ ...state, offers: e.target.checked })} className="size-5 accent-lagoon-700" />
      </label>
    </div>
  );
}

/** Filters live in the URL so results are shareable, crawlable and back-button friendly. */
export function FiltersButton({ facets }: { facets: Facets }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FilterState>(() => readState(params));
  const [pending, startTransition] = useTransition();
  const count = activeFilterCount(params);

  const apply = (next: FilterState) => {
    const q = new URLSearchParams(params.toString());
    FILTER_KEYS.forEach((k) => q.delete(k));
    q.delete("page");
    if (next.type.length) q.set("type", next.type.join(","));
    if (next.amenities.length) q.set("amenities", next.amenities.join(","));
    if (next.minPrice) q.set("minPrice", next.minPrice);
    if (next.maxPrice) q.set("maxPrice", next.maxPrice);
    if (next.bedrooms) q.set("bedrooms", next.bedrooms);
    if (next.bathrooms) q.set("bathrooms", next.bathrooms);
    if (next.rating) q.set("rating", next.rating);
    if (next.offers) q.set("offers", "1");
    trackEvent("filter_used", { props: { filters: [...q.keys()].filter((k) => (FILTER_KEYS as readonly string[]).includes(k)).join(",") } });
    startTransition(() => router.push(`${pathname}?${q.toString()}`, { scroll: false }));
    setOpen(false);
  };

  const empty: FilterState = { type: [], amenities: [], minPrice: "", maxPrice: "", bedrooms: "", bathrooms: "", rating: "", offers: false };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState(readState(params));
          setOpen(true);
        }}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold ring-1 ring-inset ring-ink-200 hover:ring-ink-400"
        aria-busy={pending}
      >
        <SlidersHorizontal className="size-4" aria-hidden /> Filters
        {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-ink-900 text-[0.6875rem] text-white">{count}</span>}
      </button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        footer={
          <>
            <Button variant="ghost" onClick={() => setState(empty)} className="underline underline-offset-4">
              Clear all
            </Button>
            <Button variant="dark" className="ml-auto" onClick={() => apply(state)}>
              Show results
            </Button>
          </>
        }
      >
        <FilterFields facets={facets} state={state} setState={setState} />
      </Drawer>
    </>
  );
}

export function ActiveFilterChips({ facets }: { facets: Facets }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const s = readState(params);
  const chips: { label: string; remove: () => URLSearchParams }[] = [];
  const without = (key: string, value?: string) => () => {
    const q = new URLSearchParams(params.toString());
    q.delete("page");
    if (value === undefined) q.delete(key);
    else {
      const rest = (q.get(key) ?? "").split(",").filter((v) => v && v !== value);
      if (rest.length) q.set(key, rest.join(","));
      else q.delete(key);
    }
    return q;
  };
  s.type.forEach((t) => chips.push({ label: PROPERTY_TYPE_LABELS[t] ?? t, remove: without("type", t) }));
  s.amenities.forEach((a) => chips.push({ label: facets.amenities.find((x) => x.slug === a)?.name ?? a, remove: without("amenities", a) }));
  if (s.minPrice) chips.push({ label: `From ${facets.currency} ${Number(s.minPrice).toLocaleString()}`, remove: without("minPrice") });
  if (s.maxPrice) chips.push({ label: `Up to ${facets.currency} ${Number(s.maxPrice).toLocaleString()}`, remove: without("maxPrice") });
  if (s.bedrooms) chips.push({ label: `${s.bedrooms}+ bedrooms`, remove: without("bedrooms") });
  if (s.bathrooms) chips.push({ label: `${s.bathrooms}+ bathrooms`, remove: without("bathrooms") });
  if (s.rating) chips.push({ label: `${s.rating}.0+ rating`, remove: without("rating") });
  if (s.offers) chips.push({ label: "Offers", remove: without("offers") });
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.label}>
          <button type="button" onClick={() => router.push(`${pathname}?${c.remove().toString()}`, { scroll: false })} className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-50 px-3 py-1.5 text-sm font-medium text-lagoon-800 hover:bg-lagoon-100">
            {c.label} <X className="size-3.5" aria-label="Remove filter" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SortSelect({ value }: { value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-600">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={value ?? "recommended"}
        onChange={(e) => {
          const q = new URLSearchParams(params.toString());
          q.delete("page");
          if (e.target.value === "recommended") q.delete("sort");
          else q.set("sort", e.target.value);
          router.push(`${pathname}?${q.toString()}`, { scroll: false });
        }}
        className="h-10 rounded-full bg-surface pl-4 pr-8 text-sm font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-lagoon-500"
        aria-label="Sort results"
      >
        <option value="recommended">Recommended</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="rating">Highest rated</option>
        <option value="newest">Newest</option>
      </select>
    </label>
  );
}
