import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { del as blobDel, put as blobPut } from "@vercel/blob";
import { AppError } from "@/server/errors";

// Storage adapter: local disk for development; Vercel Blob or any S3-compatible
// bucket in production.

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  /** Delete by public URL (drivers whose URLs aren't derivable from keys alone). */
  deleteUrls?(urls: string[]): Promise<void>;
  publicUrl(key: string): string;
}

const LOCAL_ROOT = path.join(process.cwd(), "uploads");

export function safeKey(key: string): string {
  const normalized = path.posix.normalize(key).replace(/^\/+/, "");
  if (normalized.startsWith("..") || normalized.includes("\0") || !/^[a-zA-Z0-9/_\-.]+$/.test(normalized)) {
    throw new Error("Invalid storage key");
  }
  return normalized;
}

const localDriver: StorageDriver = {
  async put(key, body) {
    const file = path.join(LOCAL_ROOT, safeKey(key));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  },
  async deleteMany(keys) {
    await Promise.all(keys.map((k) => rm(path.join(LOCAL_ROOT, safeKey(k)), { force: true })));
  },
  publicUrl: (key) => `/media/${safeKey(key)}`,
};

export async function readLocalObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(LOCAL_ROOT, safeKey(key)));
  } catch {
    return null;
  }
}

function s3Driver(): StorageDriver {
  const bucket = process.env.S3_BUCKET;
  const publicBase = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  if (!bucket || !publicBase) throw new Error("S3 storage requires S3_BUCKET and S3_PUBLIC_URL");
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined,
  });
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: safeKey(key), Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }),
      );
    },
    async deleteMany(keys) {
      if (keys.length === 0) return;
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((k) => ({ Key: safeKey(k) })) } }));
    },
    publicUrl: (key) => `${publicBase}/${safeKey(key)}`,
  };
}

/** Vercel Blob (public store). The store's public base URL is learned from upload responses. */
function vercelBlobDriver(): StorageDriver {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new AppError("VALIDATION", "Photo storage needs BLOB_READ_WRITE_TOKEN (connect a Vercel Blob store).");
  let base = process.env.BLOB_PUBLIC_URL?.replace(/\/$/, "") ?? null;
  const baseOrThrow = () => {
    if (!base) throw new Error("Vercel Blob base URL unknown until the first upload; set BLOB_PUBLIC_URL");
    return base;
  };
  return {
    async put(key, body, contentType) {
      const k = safeKey(key);
      const result = await blobPut(k, body, { access: "public", contentType, token, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 });
      base ??= result.url.slice(0, result.url.length - k.length - 1);
    },
    async deleteMany(keys) {
      if (keys.length) await blobDel(keys.map((k) => `${baseOrThrow()}/${safeKey(k)}`), { token });
    },
    async deleteUrls(urls) {
      if (urls.length) await blobDel(urls, { token });
    },
    publicUrl: (key) => `${baseOrThrow()}/${safeKey(key)}`,
  };
}

function selectedDriver(): "local" | "s3" | "vercel-blob" {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "s3" || explicit === "vercel-blob" || explicit === "local") return explicit;
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return "local";
}

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (driver) return driver;
  const kind = selectedDriver();
  if (kind === "local" && process.env.VERCEL) {
    throw new AppError("VALIDATION", "Photo storage isn't set up yet: in Vercel, open Storage → Create → Blob and connect it to this project, then redeploy.");
  }
  driver = kind === "s3" ? s3Driver() : kind === "vercel-blob" ? vercelBlobDriver() : localDriver;
  return driver;
}

export function isLocalStorage() {
  return selectedDriver() === "local";
}
