import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
  const item = "grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-medium";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "hover:bg-ink-100")} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-ink-300")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-400">…</span>}
          <Link href={hrefFor(p)} aria-current={p === page ? "page" : undefined} className={cn(item, p === page ? "bg-ink-900 text-white" : "hover:bg-ink-100")}>
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "hover:bg-ink-100")} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-ink-300")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
