import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4103);

// Runs against the built site served by Wrangler exactly as production serves it (pnpm build first).
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${PORT}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: `npx wrangler dev --port ${PORT} --ip 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/docs/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
