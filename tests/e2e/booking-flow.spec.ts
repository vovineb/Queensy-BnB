import { expect, test } from "./fixtures";
import { ADMIN, freshWindow, signIn, signUp } from "./helpers";

test("guest books a stay, admin confirms, guest sees the update live", async ({ browser }) => {
  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await signUp(guest, { name: "Wanjiru Kamau", country: "GB", phone: "20 7946 0958" });

  const w = freshWindow(2);
  await guest.goto(`/properties/chameleone-2?checkIn=${w.checkIn}&checkOut=${w.checkOut}&guests=2`);
  const widget = guest.getByRole("complementary", { name: "Book this stay" });
  await widget.getByRole("button", { name: "Reserve" }).click();
  await expect(guest).toHaveURL(/\/book\/chameleone-2/);
  await expect(guest.getByRole("heading", { name: "Confirm and book" })).toBeVisible();
  await guest.getByRole("button", { name: "Request to book" }).click();

  await expect(guest.getByRole("heading", { name: /Request received/ })).toBeVisible();
  const reference = (await guest.getByText(/QB-[A-Z0-9]{8}/).first().textContent())!.match(/QB-[A-Z0-9]{8}/)![0];
  await expect(guest.getByText("Awaiting confirmation").first()).toBeVisible();

  // The same dates can no longer be booked by someone else.
  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await signUp(other);
  await other.goto(`/book/chameleone-2?checkIn=${w.checkIn}&checkOut=${w.checkOut}&adults=1`);
  await expect(other.getByText("These dates can't be booked")).toBeVisible();

  // Admin confirms in a separate session.
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await signIn(admin, ADMIN.email, ADMIN.password);
  await admin.goto(`/admin/bookings?q=${reference}`);
  await admin.getByRole("link", { name: reference }).click();
  await admin.getByRole("button", { name: "Confirm booking" }).click();
  await admin.getByRole("button", { name: "Yes, continue" }).click();
  await expect(admin.getByText("Booking confirmed").first()).toBeVisible();

  // Guest's open booking page updates via realtime without a manual reload.
  await expect(guest.getByText("Confirmed", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // Guest can cancel from their trip page; dates free up again.
  await guest.getByRole("button", { name: "Cancel booking" }).click();
  await guest.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click();
  await expect(guest.getByText("Cancelled", { exact: true }).first()).toBeVisible();
  await other.reload();
  await expect(other.getByRole("button", { name: "Request to book" })).toBeVisible();

  await Promise.all([guestCtx.close(), otherCtx.close(), adminCtx.close()]);
});
