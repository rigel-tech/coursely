// import { test, expect } from '@playwright/test'

// import { seedStudentUser, cleanupStudentUser, testStudent } from './helpers/seedUser'

// const SITE = 'http://localhost:3000'

// test.describe('Public header logout', () => {
//   test.beforeAll(async () => {
//     await seedStudentUser()
//   })

//   test.afterAll(async () => {
//     await cleanupStudentUser()
//   })

//   test('a signed-in student signs out from the header', async ({ page }) => {
//     await page.goto(SITE)

//     // Anonymous: the sign-out control is not present.
//     await expect(page.getByRole('button', { name: 'Đăng xuất' })).toHaveCount(0)

//     // Sign in through the header popover.
//     await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
//     await page.locator('#login-email').fill(testStudent.email)
//     await page.locator('#login-password').fill(testStudent.password)
//     await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click()

//     // Full-document redirect to '/', then the header swaps to the sign-out control.
//     await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible()
//     await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toHaveCount(0)
//     await expect(page.getByRole('button', { name: 'Đăng ký', exact: true })).toHaveCount(0)

//     // Sign out.
//     await page.getByRole('button', { name: 'Đăng xuất' }).click()
//     await page.waitForURL(`${SITE}/`)
//     await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible()
//     await expect(page.getByRole('button', { name: 'Đăng ký', exact: true })).toBeVisible()
//     await expect(page.getByRole('button', { name: 'Đăng xuất' })).toHaveCount(0)

//     // The session really ended: a protected route bounces to the login callback.
//     await page.goto(`${SITE}/tai-khoan`)
//     await expect(page).toHaveURL(/\/\?callbackUrl=/)
//   })
// })
