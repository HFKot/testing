import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const externalServer = process.env.PLAYWRIGHT_BASE_URL;
const executablePath =
  process.env.CHROMIUM_PATH ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: externalServer || "http://127.0.0.1:5173",
    headless: true,
    launchOptions: { executablePath, args: ["--no-sandbox"] },
  },
  webServer: externalServer
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:5173/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      },
  reporter: "list",
});
