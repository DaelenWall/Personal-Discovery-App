import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const databasePath = join(tmpdir(), `discovery-e2e-${randomUUID()}.sqlite`);

export default defineConfig({
  metadata: { databasePath },
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      DISCOVERY_DB_PATH: databasePath,
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
