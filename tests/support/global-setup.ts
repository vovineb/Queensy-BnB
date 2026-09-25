import { execSync } from "node:child_process";

/**
 * Applies pending migrations (non-destructive `migrate deploy`) to the dedicated
 * test database. Individual test files truncate tables for isolation.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/queensy_test";
  if (!/_test\b|\btest_|\/test/.test(url)) throw new Error(`Refusing to run tests against a non-test database: ${url}`);
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url, DIRECT_DATABASE_URL: url } });
}
