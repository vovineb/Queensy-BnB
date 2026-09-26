import { expect, test } from "./fixtures";
import { signUp } from "./helpers";

test("anonymous users are sent to sign in for private areas", async ({ page }) => {
  for (const path of ["/account", "/account/bookings", "/admin", "/admin/users"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("customers cannot reach admin pages, admin data, or admin realtime channels", async ({ page }) => {
  await signUp(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get("/admin/bookings/export")).status()).toBe(403);
  expect((await page.request.get("/api/realtime?channels=admin")).status()).toBe(403);
  const cron = await page.request.post("/api/cron/maintenance");
  expect(cron.status()).toBe(401);
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("cross-site POSTs to API routes are rejected", async ({ request }) => {
  const res = await request.post("/api/events", { headers: { origin: "https://evil.example", "content-type": "application/json" }, data: { name: "page_view" } });
  expect(res.status()).toBe(403);
});

test("session cookie is HttpOnly and SameSite", async ({ page, context }) => {
  await signUp(page);
  const cookie = (await context.cookies()).find((c) => c.name === "qb_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
});
