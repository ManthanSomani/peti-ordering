import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: "npm start",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: "3100",
      APP_ORIGIN: "http://localhost:3100",
      DATABASE_PATH: `./data/e2e-${Date.now()}.sqlite`,
      DEMO_MODE: "true",
      COOKIE_SECURE: "false",
    },
  },
});
