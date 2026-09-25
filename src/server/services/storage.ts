import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Storage adapter: local disk for development, any S3-compatible bucket in production.

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
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

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (!driver) driver = process.env.STORAGE_DRIVER === "s3" ? s3Driver() : localDriver;
  return driver;
}
