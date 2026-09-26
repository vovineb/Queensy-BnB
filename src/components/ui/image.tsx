import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { srcSetFor, type ImageLike } from "@/lib/images";

/**
 * Responsive image using our pre-generated WebP renditions (or the original URL
 * for legacy images). Lazy by default; pass priority for above-the-fold images.
 */
export function ResponsiveImage({
  image,
  alt,
  sizes = "100vw",
  priority = false,
  className,
  fallbackLabel,
}: {
  image: ImageLike | null | undefined;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fallbackLabel?: string;
}) {
  if (!image) return <ImageFallback className={className} label={fallbackLabel} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      srcSet={srcSetFor(image)}
      sizes={sizes}
      alt={alt ?? image.alt ?? ""}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={cn("object-cover", className)}
    />
  );
}

export function ImageFallback({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-lagoon-50 to-ink-100 text-lagoon-700/70", className)} role="img" aria-label={label ?? "Photo coming soon"}>
      <ImageOff className="size-6" aria-hidden />
      {label && <span className="px-4 text-center text-xs font-medium text-ink-500">{label}</span>}
    </div>
  );
}
