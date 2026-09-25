import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy. Next.js injects inline bootstrap scripts, so
// script-src needs 'unsafe-inline' unless nonces are adopted; all other
// directives are locked to first-party origins.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.openstreetmap.org",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  // Docker builds set NEXT_OUTPUT=standalone for a minimal runtime image.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  typedRoutes: false,
  serverExternalPackages: ["sharp", "@node-rs/argon2", "pg"],
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Preserve legacy URLs from the old single-page app.
  async redirects() {
    return [
      { source: "/booking", destination: "/properties", permanent: true },
      { source: "/dashboard", destination: "/account", permanent: true },
      { source: "/feedback", destination: "/account/bookings", permanent: true },
      { source: "/support", destination: "/contact", permanent: true },
      { source: "/calendar", destination: "/admin/calendar", permanent: true },
      { source: "/admin-login", destination: "/login?next=/admin", permanent: true },
      { source: "/admin/listings", destination: "/admin/properties", permanent: true },
      { source: "/admin/feedback", destination: "/admin/reviews", permanent: true },
      { source: "/admin/tickets", destination: "/admin/inquiries", permanent: true },
      { source: "/admin/export", destination: "/admin/bookings", permanent: true },
      { source: "/admin/performance", destination: "/admin/analytics", permanent: true },
    ];
  },
};

export default nextConfig;
