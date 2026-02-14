import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const explicitBaseURL = process.env.PLAYWRIGHT_BASE_URL
const defaultPort = process.env.PLAYWRIGHT_PORT || '4173'
const baseURL = explicitBaseURL || `http://127.0.0.1:${defaultPort}`
const shouldAutoStartServer =
  !explicitBaseURL && process.env.PLAYWRIGHT_DISABLE_WEBSERVER !== 'true'
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ||
  (shouldAutoStartServer
    ? `npm run dev -- --host 127.0.0.1 --port ${defaultPort}`
    : null)
const thisFilePath = fileURLToPath(import.meta.url)
const thisDir = path.dirname(thisFilePath)
const localLibPath = path.join(
  thisDir,
  '.playwright-libs',
  'usr',
  'lib',
  'x86_64-linux-gnu'
)
const usesLocalLibPath = existsSync(localLibPath)
const ldLibraryPath = [process.env.LD_LIBRARY_PATH, usesLocalLibPath ? localLibPath : '']
  .filter(Boolean)
  .join(':')
const launchEnv = ldLibraryPath ? { LD_LIBRARY_PATH: ldLibraryPath } : undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      env: launchEnv,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(webServerCommand
    ? {
        webServer: {
          command: webServerCommand,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }
    : {}),
})
