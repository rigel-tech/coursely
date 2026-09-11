import { test, expect } from '@playwright/test'

test('renders the homepage with correct title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Coursely/)
  const heading = page.locator('h1').first()
  await expect(heading).toBeVisible()
})
