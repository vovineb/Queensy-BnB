import { test as base } from "@playwright/test";
import { Client } from "pg";

// The app rate-limits sign-ups and logins per IP; the whole suite runs from one
// IP, so reset the counters in the dedicated e2e database before each test.
export const test = base.extend<{ resetRateLimits: void }>({
  resetRateLimits: [
    async ({}, use) => {
      const client = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/queensy_e2e" });
      await client.connect();
      await client.query("DELETE FROM rate_limits");
      await client.end();
      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
