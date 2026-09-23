import { test, expect, type Page } from '@playwright/test'

import { seedHeaderStudent, cleanupHeaderStudent, testHeaderStudent } from './helpers/seedUser'

const SITE = 'http://localhost:3000'
const PHONES = [320, 375]

const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const signIn = async (page: Page): Promise<void> => {
  await page.goto(`${SITE}/student/login`)
  await page.locator('#login-email').fill(testHeaderStudent.email)
  await page.locator('#login-password').fill(testHeaderStudent.password)
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/student/login'))
}

test.describe('Header on narrow screens', () => {
  test.beforeAll(async () => {
    await seedHeaderStudent()
  })

  test.afterAll(async () => {
    await cleanupHeaderStudent()
  })

  for (const width of PHONES) {
    test(`signed out: no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(SITE)
      await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()

      expect(await horizontalOverflow(page)).toBe(0)
    })

    test(`signed in: no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await signIn(page)

      for (const path of ['/', '/student/account']) {
        await page.goto(`${SITE}${path}`)
        // The bell only renders once client-side auth resolves — the widest header state.
        await expect(page.locator('header a[href="/tai-khoan"]')).toBeVisible()

        expect(await horizontalOverflow(page), path).toBe(0)
      }
    })

    test(`signed in: the menu button sits inside the viewport at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await signIn(page)
      await page.goto(SITE)
      await expect(page.locator('header a[href="/tai-khoan"]')).toBeVisible()

      const menu = page.getByRole('button', { name: 'Menu' })
      const box = await menu.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)

      await menu.click()
      await expect(menu).toHaveAttribute('aria-expanded', 'true')
    })
  }

  test('desktop keeps the tagline and hides the menu button at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    await page.goto(SITE)

    // Assert the display rule, not the text: CI runs migrations only, so the tagline is empty
    // there and an empty block has no size for `toBeVisible` to see.
    await expect(page.locator('header a[href="/"] span.uppercase')).toHaveCSS('display', 'block')
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden()
  })
})
