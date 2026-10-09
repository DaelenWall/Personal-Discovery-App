import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = join(tmpdir(), `discovery-beta-${randomUUID()}`);
export default defineConfig({
  testDir: "./tests/beta",
  workers: 1,
  timeout: 60000,
  metadata: { directory },
  use: {
    baseURL: "https://127.0.0.1:3443",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
    {
      name: "chromium-offline",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        launchOptions: { args: ["--ignore-certificate-errors"] },
      },
    },
  ],
});
