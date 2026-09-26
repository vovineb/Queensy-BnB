// Our uploads are stored as WebP renditions `${storageKey}-${width}.webp`.
export const IMAGE_WIDTHS = [480, 960, 1600] as const;

export type ImageLike = { url: string; storageKey?: string | null; alt?: string | null; width?: number | null; height?: number | null };

export function srcSetFor(image: ImageLike): string | undefined {
  if (!image.storageKey || !/-\d+\.webp$/.test(image.url)) return undefined;
  return IMAGE_WIDTHS.map((w) => `${image.url.replace(/-\d+\.webp$/, `-${w}.webp`)} ${w}w`).join(", ");
}

export function sizedUrl(image: ImageLike, width: (typeof IMAGE_WIDTHS)[number]): string {
  if (!image.storageKey || !/-\d+\.webp$/.test(image.url)) return image.url;
  return image.url.replace(/-\d+\.webp$/, `-${width}.webp`);
}
