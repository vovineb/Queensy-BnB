import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/queensy_test",
      DIRECT_DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/queensy_test",
      APP_SECRET: "test-secret-test-secret-test-secret-test",
      DEFAULT_TIMEZONE: "Africa/Nairobi",
      DEFAULT_CURRENCY: "KES",
      STORAGE_DRIVER: "local",
    },
  },
});
