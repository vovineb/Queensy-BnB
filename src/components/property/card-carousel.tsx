"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveImage } from "@/components/ui/image";
import type { ImageLike } from "@/lib/images";
import { cn } from "@/lib/cn";

/** Lightweight scroll-snap carousel: native swipe on touch, arrows on hover for pointers. */
export function CardCarousel({ images, name, priority }: { images: ImageLike[]; name: string; priority?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) return <ResponsiveImage image={null} className="aspect-[4/3] w-full" fallbackLabel="Photos coming soon" />;

  const go = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    if (el) el.scrollTo({ left: el.clientWidth * Math.max(0, Math.min(images.length - 1, index + dir)), behavior: "smooth" });
  };

  return (
    <div className="group/carousel relative">
      <div
        ref={ref}
        className="scrollbar-none flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {images.map((img, i) => (
          <ResponsiveImage
            key={img.url}
            image={img}
            alt={img.alt || `${name} — photo ${i + 1}`}
            sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
            priority={priority && i === 0}
            className="h-full w-full shrink-0 snap-center transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" onClick={(e) => go(e, -1)} aria-label="Previous photo" className={cn("absolute left-2 top-1/2 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow opacity-0 transition group-hover/carousel:opacity-100 [@media(hover:hover)]:grid", index === 0 && "invisible")}>
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={(e) => go(e, 1)} aria-label="Next photo" className={cn("absolute right-2 top-1/2 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow opacity-0 transition group-hover/carousel:opacity-100 [@media(hover:hover)]:grid", index === images.length - 1 && "invisible")}>
            <ChevronRight className="size-4" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5" aria-hidden>
            {images.map((img, i) => (
              <span key={img.url} className={cn("size-1.5 rounded-full transition", i === index ? "bg-white" : "bg-white/55")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
