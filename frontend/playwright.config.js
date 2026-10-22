// Playwright end-to-end tests (Phase 7). Run from frontend/: npm run test:e2e
// Starts its own API (port 5001, local smart_green_hub_e2e database, fake accounts) and its own
// Vite server (port 5174) that forwards /api to that API. The local MySQL container must be running.
// Uses the Microsoft Edge already installed on the computer (no browser download).
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    baseURL: 'http://localhost:5174',
    channel: 'msedge',
    headless: true,
    // Mobile-first: the main flows run at the 390 px design width
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node ../backend/scripts/start-e2e.js',
      url: 'http://localhost:5001/api/health',
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      url: 'http://localhost:5174',
      // A fake app version, so the test 'no version banner' runs with app and API versions that differ
      env: { VITE_PROXY_TARGET: 'http://localhost:5001', VERCEL_GIT_COMMIT_SHA: 'e2eapp0000000' },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
})
