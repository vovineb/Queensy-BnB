import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = localFont({ src: "./fonts/inter-latin.woff2", variable: "--font-inter", display: "swap", weight: "100 900" });
const jakarta = localFont({ src: "./fonts/jakarta-latin.woff2", variable: "--font-jakarta", display: "swap", weight: "200 800" });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Queensy BnB — Handpicked stays across Kenya", template: "%s · Queensy BnB" },
  description:
    "Book handpicked apartments, suites and holiday homes in Kenya with real-time availability, transparent prices and a local team that answers.",
  applicationName: "Queensy BnB",
  openGraph: { type: "website", siteName: "Queensy BnB", locale: "en_KE" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-[100] rounded-md bg-ink-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
