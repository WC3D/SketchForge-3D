import { defineConfig } from "@playwright/test";
import path from "node:path";

const baseURL = process.env.SKETCHFORGE_TEST_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./browser",
  outputDir: "../test-results/mobile",
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 1366, height: 1024 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: process.env.SKETCHFORGE_TEST_URL ? undefined : {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    cwd: path.resolve(__dirname, ".."),
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
