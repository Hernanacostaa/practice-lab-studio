import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4173", headless: true },
  projects: [{ name: "chromium", use: { browserName: "chromium", channel: process.env.PLAYWRIGHT_CHANNEL || undefined } }],
  webServer: { command: "node scripts/serve.mjs", url: "http://127.0.0.1:4173", reuseExistingServer: false, timeout: 20000 },
});
