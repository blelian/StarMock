import { expect, test } from '@playwright/test'

test.describe('auth mode selection', () => {
  test('defaults to login mode on page load', async ({ page }) => {
    await page.goto('/login.html', { waitUntil: 'commit' })

    await expect(page.locator('#login-tab')).toHaveClass(/bg-primary/)
    await expect(page.locator('#signup-tab')).not.toHaveClass(/bg-primary/)
    await expect(page.locator('#fullname-field')).toBeHidden()
    await expect(page.locator('#confirm-password-field')).toBeHidden()
  })

  test('opens in signup mode from query param', async ({ page }) => {
    await page.goto('/login.html?mode=signup', { waitUntil: 'commit' })

    await expect(page.locator('#signup-tab')).toHaveClass(/bg-primary/)
    await expect(page.locator('#login-tab')).not.toHaveClass(/bg-primary/)
    await expect(page.locator('#fullname-field')).toBeVisible()
    await expect(page.locator('#confirm-password-field')).toBeVisible()
  })
})
