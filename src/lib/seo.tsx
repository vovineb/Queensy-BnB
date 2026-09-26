import type { Metadata } from "next";
import { getSiteUrl } from "./site-url";

export const siteUrl = getSiteUrl;
export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`);

/** Renders JSON-LD safely (escapes `<` so content can't break out of the script tag). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

type SiteInfo = { siteName: string; contactEmail: string; contactPhone: string; instagramUrl: string; facebookUrl: string; xUrl: string; tiktokUrl: string; tagline: string };

export function organizationJsonLd(s: SiteInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: s.siteName,
    url: siteUrl(),
    logo: absoluteUrl("/icon.svg"),
    description: s.tagline,
    address: { "@type": "PostalAddress", addressCountry: "KE" },
    ...(s.contactEmail || s.contactPhone
      ? { contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", email: s.contactEmail || undefined, telephone: s.contactPhone || undefined, availableLanguage: ["English", "Swahili"] }] }
      : {}),
    sameAs: [s.instagramUrl, s.facebookUrl, s.xUrl, s.tiktokUrl].filter(Boolean),
  };
}

export function websiteJsonLd(s: SiteInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: s.siteName,
    url: siteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl()}/properties?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

/** Consistent page metadata with canonical URL and social cards. */
export function pageMetadata({ title, description, path, image, noindex }: { title: string; description: string; path: string; image?: string | null; noindex?: boolean }): Metadata {
  const images = image ? [{ url: absoluteUrl(image) }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
