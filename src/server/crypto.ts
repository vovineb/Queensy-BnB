import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(value: string, secret = process.env.APP_SECRET ?? ""): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L

/** Human-friendly booking reference, e.g. QB-7K2M9PXA. */
export function bookingReference(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length];
  return `QB-${out}`;
}
