import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function RatingInline({ value, count, className, size = "sm" }: { value: number | string | null | undefined; count?: number; className?: string; size?: "sm" | "md" }) {
  if (value === null || value === undefined || !count) {
    return <span className={cn("text-sm text-ink-500", className)}>New</span>;
  }
  const n = Number(value);
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium text-ink-900", size === "md" ? "text-base" : "text-sm", className)}>
      <Star className={cn("fill-gold-400 text-gold-400", size === "md" ? "size-4" : "size-3.5")} aria-hidden />
      <span>{n.toFixed(1)}</span>
      {count !== undefined && (
        <span className="font-normal text-ink-500">
          ({count} review{count === 1 ? "" : "s"})
        </span>
      )}
      <span className="sr-only">out of 5</span>
    </span>
  );
}

export function RatingBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ? (value / 5) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-ink-700">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100" aria-hidden>
        <div className="h-full rounded-full bg-ink-800" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-medium tabular-nums">{value ? value.toFixed(1) : "–"}</span>
    </div>
  );
}
