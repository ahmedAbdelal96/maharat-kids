import { defineConfig, devices } from '@playwright/test';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env');

export default defineConfig({
  testDir: './e2e-tests',
  // Acceptance fixtures share the disposable test database; serial workers prevent cross-test sessions and fixture races.
  workers: 1,
  // A single retry is reserved for transient remote-DB/browser timing noise;
  // server startup itself is deterministic and is never retried by the harness.
  retries: 1,
  timeout: 60000,
  expect: { timeout: 30000 },
  webServer: {
    command: 'node scripts/playwright-server.mjs',
    url: 'http://localhost:3410/api/health',
    reuseExistingServer: false,
    timeout: 120000,
    // Test mode is explicit and scoped to this child process; production
    // deployments never receive this provider configuration.
    env: { ...process.env, PLAYWRIGHT_ACCEPTANCE_PORT: '3410', MK_E2E_TEST_MODE: '1', MK_E2E_OTP_CODE: '123456' },
  },
  use: {
    baseURL: 'http://localhost:3410',
    extraHTTPHeaders: { 'x-vercel-ip-country': 'SA' },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
