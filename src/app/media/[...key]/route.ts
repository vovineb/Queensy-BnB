import { readLocalObject } from "@/server/services/storage";

/** Serves locally stored uploads (development / single-server deployments). */
export async function GET(_request: Request, ctx: { params: Promise<{ key: string[] }> }) {
  if (process.env.STORAGE_DRIVER === "s3") return new Response("Not found", { status: 404 });
  const { key } = await ctx.params;
  let body: Buffer | null = null;
  try {
    body = await readLocalObject(key.join("/"));
  } catch {
    body = null;
  }
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
