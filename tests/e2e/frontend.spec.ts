import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('can load homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/Payload Website Template/)
    await expect(page.locator('h2').first()).toHaveText('Các khóa học nổi bật')
  })
})
