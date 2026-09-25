"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/server/errors";
import { cn } from "@/lib/cn";

/** A select that runs a server action on change (status pickers in tables). */
export function ActionSelect({ value, options, onChange, label }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => Promise<ActionResult<unknown>>; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={label}
      defaultValue={value}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        start(async () => {
          const r = await onChange(v);
          if (r.ok) toast.success(r.message ?? "Updated");
          else toast.error(r.error);
          router.refresh();
        });
      }}
      className="h-9 rounded-md bg-surface pl-2.5 pr-7 text-sm ring-1 ring-inset ring-ink-200 disabled:opacity-60"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function ActionButton({ children, onClick, tone = "default", className }: { children: React.ReactNode; onClick: () => Promise<ActionResult<unknown>>; tone?: "default" | "danger" | "brand"; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { const r = await onClick(); if (r.ok) toast.success(r.message ?? "Done"); else toast.error(r.error); router.refresh(); })}
      className={cn(
        "h-9 rounded-md px-3 text-sm font-semibold ring-1 ring-inset transition disabled:opacity-60",
        tone === "danger" ? "text-danger-700 ring-danger-600/30 hover:bg-danger-50" : tone === "brand" ? "bg-lagoon-700 text-white ring-lagoon-700 hover:bg-lagoon-800" : "ring-ink-200 hover:bg-ink-50",
        className,
      )}
    >
      {pending ? "…" : children}
    </button>
  );
}
