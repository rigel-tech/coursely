import { test, expect } from '@playwright/test'

test('renders the homepage with 200 status and correct title', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/Coursely/)
  const heading = page.locator('h1').first()
  await expect(heading).toBeVisible()
})
