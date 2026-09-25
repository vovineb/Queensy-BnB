import { expect, test } from "./fixtures";
import { ADMIN, signIn, signUp } from "./helpers";

test("customer and admin chat in real time with typing and read receipts", async ({ browser }) => {
  const cCtx = await browser.newContext();
  const customer = await cCtx.newPage();
  await signUp(customer, { name: "Otieno Test" });
  await customer.goto("/account/messages/new");
  const subject = `Airport pickup ${Date.now()}`;
  await customer.getByLabel("Subject").fill(subject);
  await customer.getByLabel("Message").fill("Can you arrange a pickup from Ukunda airstrip?");
  await customer.getByRole("button", { name: "Send message" }).click();
  await expect(customer).toHaveURL(/\/account\/messages\/(?!new)[a-z0-9]+$/);
  const convoUrl = customer.url();
  const convoId = convoUrl.split("/").pop()!;

  const aCtx = await browser.newContext();
  const admin = await aCtx.newPage();
  await signIn(admin, ADMIN.email, ADMIN.password);
  await admin.goto(`/admin/inbox/${convoId}`);
  const adminLog = admin.getByRole("log", { name: "Messages" });
  const customerLog = customer.getByRole("log", { name: "Messages" });
  await expect(adminLog.getByText("Can you arrange a pickup from Ukunda airstrip?")).toBeVisible();

  // Customer typing shows up for admin; message arrives without reload.
  await customer.getByLabel("Message", { exact: true }).fill("Also, is there a baby cot");
  await expect(adminLog.getByText(/is typing/)).toBeVisible({ timeout: 10_000 });
  await customer.getByLabel("Message", { exact: true }).press("Enter");
  await expect(adminLog.getByText("Also, is there a baby cot")).toBeVisible({ timeout: 10_000 });

  await admin.getByLabel("Message", { exact: true }).fill("Yes to both — see you soon!");
  await admin.getByRole("button", { name: "Send message" }).click();
  await expect(customerLog.getByText("Yes to both — see you soon!")).toBeVisible({ timeout: 10_000 });
  // Admin sees the customer has read it.
  await expect(adminLog.getByText("Seen")).toBeVisible({ timeout: 10_000 });

  await Promise.all([cCtx.close(), aCtx.close()]);
});
