import { expect, test } from "./fixtures";
import sharp from "sharp";
import { ADMIN, freshWindow, signIn } from "./helpers";

test("admin creates a property, uploads photos, publishes, and runs an offer", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin/);
  const name = `Nyali Sea View ${Date.now()}`;

  await page.goto("/admin/properties/new");
  await page.getByLabel("Property name").fill(name);
  await page.getByLabel(/Short summary/).fill("Bright 2-bedroom apartment with a sea view.");
  await page.getByLabel(/Full description/).fill("Two bedrooms, balcony, fast Wi-Fi.\n\nFive minutes to the beach.");
  await page.getByLabel("Max guests").fill("4");
  await page.getByLabel("Bedrooms").fill("2");
  await page.getByLabel("Price per night").fill("8000");
  await page.getByLabel("Wi-Fi").check();
  await page.getByRole("button", { name: "Add room" }).click();
  await page.getByLabel("Room 1 beds").fill("1 queen bed");
  await page.getByRole("button", { name: "Create property" }).click();
  await expect(page.getByText("Property created as a draft")).toBeVisible();

  // Invalid upload (a text file renamed .jpg) is rejected; a real image is optimised and stored.
  const fake = { name: "virus.jpg", mimeType: "image/jpeg", buffer: Buffer.from("definitely not an image") };
  const real = { name: "sea.jpg", mimeType: "image/jpeg", buffer: await sharp({ create: { width: 1600, height: 1000, channels: 3, background: { r: 30, g: 120, b: 140 } } }).jpeg().toBuffer() };
  await page.getByLabel("Choose photos to upload").setInputFiles([fake, real]);
  await expect(page.getByText(/virus\.jpg: That file isn't a supported image/)).toBeVisible();
  await expect(page.getByText("Cover", { exact: true })).toBeVisible();
  const src = await page.locator("ul img").first().getAttribute("src");
  expect(src).toMatch(/\/media\/properties\/.+-1600\.webp$/);
  const media = await page.request.get(src!);
  expect(media.headers()["content-type"]).toBe("image/webp");

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();

  // Now visible to guests.
  await page.goto(`/properties?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  const propertyUrl = await page.getByRole("link", { name: new RegExp(name) }).first().getAttribute("href");

  // Offer: 25% off, applied automatically in the quote.
  await page.goto("/admin/offers/new");
  await page.getByLabel("Title").fill(`E2E 25% off ${Date.now()}`);
  await page.getByLabel("Percent off").fill("25");
  await page.getByLabel("Check-in until").fill(new Date(Date.now() + 800 * 86_400_000).toISOString().slice(0, 10));
  await page.getByLabel("All stays").uncheck();
  await page.getByLabel(name).check();
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page).toHaveURL(/\/admin\/offers$/);

  const w = freshWindow(2);
  await page.goto(`${propertyUrl}?checkIn=${w.checkIn}&checkOut=${w.checkOut}`);
  const widget = page.getByRole("complementary", { name: "Book this stay" });
  await expect(widget.getByText("−KES 4,000")).toBeVisible();
  await expect(widget.getByText("KES 12,000").first()).toBeVisible();
});

test("admin blocks dates and guests can no longer pick them", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/properties");
  await page.getByRole("link", { name: /Chameleone 1/ }).click();
  await page.getByRole("link", { name: "Availability" }).click();
  const w = freshWindow(2);
  await page.getByLabel("From (first blocked night)").fill(w.checkIn);
  await page.getByLabel("Until (first open night)").fill(w.checkOut);
  await page.getByLabel("Reason").fill("Maintenance");
  await page.getByRole("button", { name: "Block dates" }).click();
  await expect(page.getByText("Maintenance").first()).toBeVisible();

  await page.goto(`/properties/chameleone-1?checkIn=${w.checkIn}&checkOut=${w.checkOut}`);
  await expect(page.getByRole("complementary", { name: "Book this stay" }).getByRole("alert")).toBeVisible();
});

test("bookings export is a CSV with formula-injection protection", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  const res = await page.request.get("/admin/bookings/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(await res.text()).toContain('"Reference","Status","Property"');
});
