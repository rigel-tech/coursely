import { test, expect, type Page } from '@playwright/test'

import { seedStudentUser, cleanupStudentUser, testStudent } from './helpers/seedUser'

const SITE = 'http://localhost:3000'

const signIn = async (page: Page): Promise<void> => {
  await page.goto(`${SITE}/student/login`)
  await page.locator('#login-email').fill(testStudent.email)
  await page.locator('#login-password').fill(testStudent.password)
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/student/login'))
}

const openBell = async (page: Page) => {
  await page.goto(SITE)
  const bell = page.getByRole('button', { name: 'Thông báo' })
  await bell.click()
  const panel = page.locator('header div:has(> button[aria-label="Thông báo"]) > div')
  await expect(panel).toBeVisible()
  return { bell, panel }
}

test.describe('Notification bell panel', () => {
  test.beforeAll(async () => {
    await seedStudentUser()
  })

  test.afterAll(async () => {
    await cleanupStudentUser()
  })

  for (const width of [320, 375]) {
    test(`is centred horizontally inside the viewport at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await signIn(page)
      const { panel } = await openBell(page)

      const box = (await panel.boundingBox())!
      const left = box.x
      const right = width - (box.x + box.width)

      expect(left).toBeGreaterThanOrEqual(0)
      expect(right).toBeGreaterThanOrEqual(0)
      expect(Math.abs(left - right)).toBeLessThanOrEqual(1)
    })
  }

  test('stays anchored under the bell at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    await signIn(page)
    const { bell, panel } = await openBell(page)

    const bellBox = (await bell.boundingBox())!
    const box = (await panel.boundingBox())!

    expect(box.width).toBe(320)
    expect(Math.abs(box.x + box.width - (bellBox.x + bellBox.width))).toBeLessThanOrEqual(1)
  })
})
