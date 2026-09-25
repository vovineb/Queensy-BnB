import { cn } from "@/lib/cn";

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span aria-hidden className={cn("inline-grid size-9 shrink-0 place-items-center rounded-full bg-lagoon-100 text-sm font-semibold text-lagoon-800", className)}>
      {initials || "?"}
    </span>
  );
}
