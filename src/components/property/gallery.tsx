"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ChevronLeft, ChevronRight, Grid3x3, X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { ResponsiveImage } from "@/components/ui/image";
import type { ImageLike } from "@/lib/images";
import { cn } from "@/lib/cn";
import { trackEvent } from "@/lib/analytics-client";

type GalleryImage = ImageLike & { id: string; caption?: string | null };

export function PropertyGallery({ images, name, propertyId }: { images: GalleryImage[]; name: string; propertyId: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);

  const show = (i: number) => {
    setOpen(i);
    trackEvent("gallery_opened", { propertyId });
  };

  if (images.length === 0) {
    return <ResponsiveImage image={null} className="aspect-[16/9] w-full rounded-2xl sm:aspect-[21/9]" fallbackLabel="Photos of this stay are coming soon" />;
  }

  const altFor = (img: GalleryImage, i: number) => img.alt || `${name} — photo ${i + 1}`;
  const grid = images.slice(0, 5);

  return (
    <>
      {/* Mobile: swipeable, full-bleed */}
      <div className="relative -mx-4 sm:hidden">
        <div className="scrollbar-none flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto" onScroll={(e) => setMobileIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {images.map((img, i) => (
            <button key={img.id} type="button" onClick={() => show(i)} className="h-full w-full shrink-0 snap-center" aria-label={`Open photo ${i + 1} of ${images.length}`}>
              <ResponsiveImage image={img} alt={altFor(img, i)} priority={i === 0} sizes="100vw" className="h-full w-full" />
            </button>
          ))}
        </div>
        <span className="absolute bottom-3 right-3 rounded-md bg-ink-950/70 px-2 py-1 text-xs font-medium text-white">
          {mobileIndex + 1} / {images.length}
        </span>
      </div>

      {/* Tablet/desktop: mosaic */}
      <div className={cn("relative hidden gap-2 overflow-hidden rounded-2xl sm:grid sm:aspect-[2/1] lg:aspect-[21/9]", grid.length >= 5 ? "grid-cols-4 grid-rows-2" : grid.length >= 3 ? "grid-cols-3 grid-rows-2" : "grid-cols-2")}>
        {grid.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => show(i)}
            className={cn("group relative overflow-hidden bg-ink-100", i === 0 && grid.length >= 3 && "col-span-2 row-span-2", grid.length === 1 && "col-span-2")}
            aria-label={`Open photo ${i + 1} of ${images.length}`}
          >
            <ResponsiveImage image={img} alt={altFor(img, i)} priority={i === 0} sizes={i === 0 ? "(min-width:1024px) 640px, 60vw" : "320px"} className="h-full w-full transition duration-500 group-hover:scale-[1.03] group-hover:brightness-95" />
          </button>
        ))}
        {images.length > 1 && (
          <button type="button" onClick={() => show(0)} className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-sm font-semibold shadow-card ring-1 ring-ink-900/10 hover:bg-ink-50">
            <Grid3x3 className="size-4" aria-hidden /> Show all {images.length} photos
          </button>
        )}
      </div>

      <Lightbox images={images} index={open} onIndexChange={setOpen} name={name} />
    </>
  );
}

function Lightbox({ images, index, onIndexChange, name }: { images: GalleryImage[]; index: number | null; onIndexChange: (i: number | null) => void; name: string }) {
  const [direction, setDirection] = useState(0);
  const go = useCallback(
    (dir: 1 | -1) => {
      if (index === null) return;
      setDirection(dir);
      onIndexChange((index + dir + images.length) % images.length);
    },
    [index, images.length, onIndexChange],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const img = index !== null ? images[index] : null;

  return (
    <RadixDialog.Root open={index !== null} onOpenChange={(o) => !o && onIndexChange(null)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink-950" />
        <RadixDialog.Content className="fixed inset-0 z-50 flex flex-col text-white focus:outline-none">
          <RadixDialog.Title className="sr-only">{name} photos</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">Use the arrow keys to move between photos.</RadixDialog.Description>
          <div className="flex items-center justify-between px-4 py-3">
            <RadixDialog.Close className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium hover:bg-white/10" aria-label="Close photos">
              <X className="size-5" /> Close
            </RadixDialog.Close>
            <span className="text-sm tabular-nums text-white/80" aria-live="polite">
              {index !== null ? index + 1 : 0} / {images.length}
            </span>
            <span className="w-20" />
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-16">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              {img && (
                <m.figure
                  key={img.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -60 }}
                  transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  className="flex max-h-full flex-col items-center"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) go(1);
                    else if (info.offset.x > 60) go(-1);
                  }}
                >
                  <ResponsiveImage image={img} alt={img.alt || `${name} — photo ${(index ?? 0) + 1}`} sizes="100vw" priority className="max-h-[78dvh] w-auto max-w-full select-none rounded-lg object-contain" />
                  {img.caption && <figcaption className="mt-3 text-center text-sm text-white/80">{img.caption}</figcaption>}
                </m.figure>
              )}
            </AnimatePresence>
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid" aria-label="Previous photo">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid" aria-label="Next photo">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-4">
            {images.map((thumb, i) => (
              <button key={thumb.id} type="button" onClick={() => { setDirection(i > (index ?? 0) ? 1 : -1); onIndexChange(i); }} className={cn("h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition", i === index ? "ring-white" : "opacity-50 ring-transparent hover:opacity-90")} aria-label={`Photo ${i + 1}`} aria-current={i === index}>
                <ResponsiveImage image={thumb} alt="" sizes="80px" className="h-full w-full" />
              </button>
            ))}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
