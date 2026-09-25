import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-950">
          <ChevronLeft className="size-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, actions, children, className, padded = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-xl bg-surface ring-1 ring-ink-200", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
          {title && <h2 className="font-sans text-sm font-semibold text-ink-950">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "default" | "attention" }) {
  const body = (
    <>
      <p className="text-sm text-ink-600">{label}</p>
      <p className={cn("mt-1.5 font-display text-2xl font-bold tabular-nums tracking-tight", tone === "attention" ? "text-sunset-700" : "text-ink-950")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl bg-surface p-4 ring-1 ring-ink-200 transition sm:p-5";
  return href ? <Link href={href} className={cn(cls, "hover:ring-ink-300 hover:shadow-card")}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Responsive table: horizontal scroll on small screens, sticky header. */
export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-ink-200">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-ink-200 bg-ink-50/80 text-xs font-semibold uppercase tracking-wide text-ink-500">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

/** GET-form filter bar: keeps filters in the URL (shareable, back-button friendly). */
export function FilterBar({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form action={action} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl bg-surface p-3 ring-1 ring-ink-200">
      {children}
      <button type="submit" className="h-10 rounded-md bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-800">Apply</button>
      <Link href={action} className="h-10 content-center rounded-md px-3 text-sm font-medium text-ink-600 hover:bg-ink-100">Reset</Link>
    </form>
  );
}

export const filterInput = "h-10 rounded-md bg-surface px-3 text-sm ring-1 ring-inset ring-ink-200 focus:outline-none focus:ring-2 focus:ring-lagoon-500";

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-ink-500">{children}</td>
    </tr>
  );
}
