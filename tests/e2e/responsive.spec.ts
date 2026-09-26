import { expect, test } from "./fixtures";
import { ADMIN, signIn } from "./helpers";

const WIDTHS = [320, 375, 390, 414, 768, 1024, 1280, 1440, 1920];
const PUBLIC = ["/", "/properties", "/properties/wendys-penthouse", "/destinations/diani", "/contact", "/login", "/signup"];
const ADMIN_PAGES = ["/admin", "/admin/bookings", "/admin/calendar", "/admin/properties"];

async function noHorizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        // Ignore intentionally scrollable containers' children.
        let p = el.parentElement;
        while (p) {
          const s = getComputedStyle(p);
          if (s.overflowX === "auto" || s.overflowX === "scroll" || s.overflowX === "hidden") return false;
          p = p.parentElement;
        }
        return r.right > doc.clientWidth + 1 && r.width > 0;
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
    return { overflow: doc.scrollWidth > doc.clientWidth + 1, offenders };
  });
}

for (const width of WIDTHS) {
  test(`public pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PUBLIC) {
      await page.goto(path);
      const r = await noHorizontalOverflow(page);
      expect(r, `${path} at ${width}px: ${r.offenders.join(", ")}`).toEqual({ overflow: false, offenders: [] });
    }
  });
}

for (const width of [375, 768, 1280]) {
  test(`admin pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page, ADMIN.email, ADMIN.password);
    for (const path of ADMIN_PAGES) {
      await page.goto(path);
      const r = await noHorizontalOverflow(page);
      expect(r, `${path} at ${width}px: ${r.offenders.join(", ")}`).toEqual({ overflow: false, offenders: [] });
    }
  });
}

test("mobile property page has a sticky booking bar and a menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/properties/wendys-penthouse");
  await expect(page.getByRole("button", { name: "Check dates" })).toBeInViewport();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Stays" })).toBeVisible();
});
