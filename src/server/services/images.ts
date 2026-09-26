import "server-only";
import sharp, { type Metadata as SharpMetadata } from "sharp";
import { randomToken } from "@/server/crypto";
import { AppError } from "@/server/errors";
import { storage } from "./storage";

export const IMAGE_WIDTHS = [480, 960, 1600] as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif", "tiff"]);

export type StoredImage = { url: string; storageKey: string; width: number; height: number };

/**
 * Validates an uploaded image by decoding it (never trusting the declared MIME
 * type), strips metadata (EXIF/GPS), auto-rotates, and stores WebP renditions.
 * Renditions live at `${storageKey}-${width}.webp`.
 */
export async function processAndStoreImage(file: File, folder: string): Promise<StoredImage> {
  if (file.size === 0) throw new AppError("VALIDATION", "The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "Images must be 15 MB or smaller.");
  const input = Buffer.from(await file.arrayBuffer());

  let meta: SharpMetadata;
  try {
    meta = await sharp(input, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new AppError("VALIDATION", "That file isn't a supported image. Use JPG, PNG, WebP or AVIF.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format) || !meta.width || !meta.height) {
    throw new AppError("VALIDATION", "That file isn't a supported image. Use JPG, PNG, WebP or AVIF.");
  }
  if (meta.width < 400 || meta.height < 300) {
    throw new AppError("VALIDATION", "Images should be at least 400 × 300 pixels.");
  }

  const storageKey = `${folder}/${Date.now().toString(36)}-${randomToken(8)}`;
  const base = sharp(input, { limitInputPixels: 80_000_000 }).rotate();
  let largest = { width: 0, height: 0 };
  for (const width of IMAGE_WIDTHS) {
    const { data, info } = await base
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    await storage().put(`${storageKey}-${width}.webp`, data, "image/webp");
    if (info.width >= largest.width) largest = { width: info.width, height: info.height };
  }
  const maxWidth = IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return { url: storage().publicUrl(`${storageKey}-${maxWidth}.webp`), storageKey, width: largest.width, height: largest.height };
}

export async function deleteStoredImage(image: { storageKey: string | null; url: string }) {
  if (!image.storageKey) return; // external (legacy) image — nothing of ours to delete
  const driver = storage();
  if (driver.deleteUrls && /-\d+\.webp$/.test(image.url)) {
    await driver.deleteUrls(IMAGE_WIDTHS.map((w) => image.url.replace(/-\d+\.webp$/, `-${w}.webp`)));
    return;
  }
  await driver.deleteMany(IMAGE_WIDTHS.map((w) => `${image.storageKey}-${w}.webp`));
}
