import { expect, test } from "./fixtures";

test("property pages are server-rendered with metadata and structured data", async ({ request }) => {
  const html = await (await request.get("/properties/wendys-penthouse")).text();
  expect(html).toContain("<title>Wendy&#x27;s Penthouse — Penthouse in Diani · Queensy BnB</title>");
  expect(html).toMatch(/<meta name="description" content="[^"]{80,}"/);
  expect(html).toMatch(/<link rel="canonical" href="http:\/\/localhost:\d+\/properties\/wendys-penthouse"/);
  expect(html).toContain('property="og:title"');
  expect(html).toContain('"@type":"VacationRental"');
  expect(html).toContain('"@type":"BreadcrumbList"');
  // Real content is in the HTML (not client-only).
  expect(html).toContain("Luxury 3-bedroom penthouse");
  // No fabricated rating when there are no reviews.
  expect(html).not.toContain("AggregateRating");
});

test("destination pages, sitemap and robots", async ({ request }) => {
  const dest = await (await request.get("/destinations/diani")).text();
  expect(dest).toContain('"@type":"TouristDestination"');
  expect(dest).toContain("Stays in Diani");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/properties/wendys-penthouse");
  expect(sitemap).toContain("/destinations/diani");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap:");
});

test("filtered search pages are noindex, the canonical listing is indexable", async ({ request }) => {
  expect(await (await request.get("/properties?bedrooms=2")).text()).toContain('name="robots" content="noindex, follow"');
  expect(await (await request.get("/properties")).text()).not.toContain("noindex");
});

test("legacy URLs redirect permanently", async ({ request }) => {
  for (const [from, to] of [["/booking", "/properties"], ["/admin/listings", "/admin/properties"], ["/dashboard", "/account"]]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toBe(to);
  }
});
