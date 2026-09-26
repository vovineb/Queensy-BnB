import { expect, test } from "./fixtures";
import { freshWindow } from "./helpers";

test("guests can browse, search and check prices without an account", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/properties\?/);
  await expect(page.getByRole("heading", { name: "All stays" })).toBeVisible();
  await page.getByRole("link", { name: /Wendy's Penthouse/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Wendy's Penthouse" })).toBeVisible();

  // Pre-filled dates from the URL produce a server quote.
  const w = freshWindow(3);
  await page.goto(`/properties/wendys-penthouse?checkIn=${w.checkIn}&checkOut=${w.checkOut}&guests=2`);
  const widget = page.getByRole("complementary", { name: "Book this stay" });
  await expect(widget.getByText("KES 15,500 × 3 nights")).toBeVisible();
  await expect(widget.getByText("KES 46,500").first()).toBeVisible();

  // Reserving requires an account; the user is sent to sign in and brought back.
  await widget.getByRole("button", { name: "Reserve" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fbook%2Fwendys-penthouse/);
});

test("date picker lets guests choose dates by clicking", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/properties/chameleone-1");
  const widget = page.getByRole("complementary", { name: "Book this stay" });
  await widget.getByRole("button", { name: /Check-in/ }).click();
  const days = widget.locator(".rdp-day:not(.rdp-disabled) button");
  await days.nth(10).click();
  await days.nth(13).click();
  await expect(widget.getByText(/× 3 nights/)).toBeVisible();
});

test("filters live in the URL and empty states explain what to do", async ({ page }) => {
  await page.goto("/properties?bedrooms=3");
  await expect(page.getByText("1 stay")).toBeVisible();
  await expect(page.getByRole("button", { name: /3\+ bedrooms/ })).toBeVisible();
  await page.goto("/properties?q=atlantis");
  await expect(page.getByRole("heading", { name: "No stays match your search" })).toBeVisible();
});
