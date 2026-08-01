import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests, against the app running for real in a browser.
 *
 * These exist because the unit suite cannot catch the things that actually
 * broke: a form id that outlived one expense and overwrote the previous one,
 * a button missing from the screen where it was needed, a list showing "no
 * expenses" while it loaded. All of those typecheck, and all of them reached
 * a phone.
 *
 * A phone viewport, because that is the only way this app is used.
 */
export default defineConfig({
  testDir: './e2e',
  // The suite writes to IndexedDB, so each file gets its own browser context;
  // running files in parallel is safe, tests within a file are not.
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: 'http://localhost:5173/crop-ledger/',
    trace: 'on-first-retry',
    // A failure you cannot see is a failure you will argue with.
    screenshot: 'only-on-failure',
    ...(process.env.CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } }
      : {}),
  },

  projects: [
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], isMobile: true, hasTouch: true },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/crop-ledger/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
