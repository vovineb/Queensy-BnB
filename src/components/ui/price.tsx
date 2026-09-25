import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

export function Price({ amount, currency, unit = "night", className, prefix }: { amount: number; currency: string; unit?: string | null; className?: string; prefix?: string }) {
  return (
    <span className={cn("text-ink-950", className)}>
      {prefix && <span className="text-ink-600">{prefix} </span>}
      <span className="font-semibold tabular-nums">{formatMoney(amount, currency)}</span>
      {unit && <span className="font-normal text-ink-600"> / {unit}</span>}
    </span>
  );
}
