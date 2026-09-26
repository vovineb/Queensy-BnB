/**
 * Public origin of the site, used for canonical URLs, the sitemap and links in
 * emails. NEXT_PUBLIC_SITE_URL wins; on Vercel we fall back to the project's
 * production domain (or the deployment URL for previews).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
