import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight", tone === "light" ? "text-white" : "text-ink-950", className)} aria-label="Queensy BnB home">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" className={tone === "light" ? "fill-white/15" : "fill-lagoon-700"} />
        <path d="M9 17.5 16 11l7 6.5V23a1 1 0 0 1-1 1h-3.5v-4.5h-5V24H10a1 1 0 0 1-1-1v-5.5Z" fill="#fff" />
        <circle cx="23.5" cy="9" r="2.5" className="fill-sunset-400" />
      </svg>
      <span>
        Queensy<span className={tone === "light" ? "text-white/70" : "text-lagoon-700"}> BnB</span>
      </span>
    </Link>
  );
}
