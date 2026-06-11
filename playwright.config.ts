import { defineConfig, devices } from "@playwright/test";

const localDatabaseUrl =
  "postgresql://aeroops_local:aeroops_local_password@127.0.0.1:5434/aeroops_local?schema=public";
const baseURL = process.env.AEROOPS_BROWSER_BASE_URL ?? "http://127.0.0.1:3200";

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [["list"]],
  testDir: "./tests/browser",
  timeout: 45_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:local",
    env: {
      AEROOPS_ENABLE_TEST_AUTH: process.env.AEROOPS_ENABLE_TEST_AUTH ?? "1",
      DATABASE_URL: process.env.DATABASE_URL ?? localDatabaseUrl,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
