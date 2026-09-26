import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@e2e.test", password: "admin-e2e-password" };

export function isoInDays(n: number) {
  // Nairobi calendar date n days from now.
  const d = new Date(Date.now() + 3 * 3_600_000 + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Unique, far-apart date windows so reruns against the same DB don't collide. */
export function freshWindow(nights = 3) {
  const offset = 30 + Math.floor(Math.random() * 400);
  return { checkIn: isoInDays(offset), checkOut: isoInDays(offset + nights) };
}

export async function signUp(page: Page, opts: { name?: string; country?: string; phone?: string } = {}) {
  const email = `guest-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(opts.name ?? "Test Guest");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  if (opts.country) await page.getByLabel("Country code").selectOption(opts.country);
  await page.getByLabel("Mobile number").fill(opts.phone ?? "712 345 678");
  await page.getByLabel("Password", { exact: true }).fill("a-very-safe-password");
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account/);
  return email;
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
