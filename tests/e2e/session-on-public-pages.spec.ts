import { test, expect, type BrowserContext } from '@playwright/test'

import { seedSessionStudent, cleanupSessionStudent, testSessionStudent } from './helpers/seedUser'

const SITE = 'http://localhost:3000'
const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'

/**
 * `proxy` no longer runs on `/` or `/khoa-hoc`, so it is no longer what keeps a browsing
 * student signed in. Renewal moved to `/next/auth-status`, which the header fetches on every
 * page load, and this is the only test that exercises that end to end — through the real
 * login form, the real header, and a real navigation between two public pages.
 *
 * The fifteen-minute wait is simulated rather than endured: deleting `coursely-access` while
 * leaving `coursely-refresh` alone puts the browser in exactly the state an expired access
 * token does, since nothing reads the access cookie's contents once it is gone.
 */
const dropAccessCookie = async (context: BrowserContext): Promise<void> => {
  const kept = (await context.cookies()).filter((c) => c.name !== ACCESS_COOKIE)

  await context.clearCookies()
  await context.addCookies(kept)

  const names = (await context.cookies()).map((c) => c.name)
  expect(names).not.toContain(ACCESS_COOKIE)
  expect(names).toContain(REFRESH_COOKIE)
}

test.describe('a session survives browsing public pages', () => {
  test.beforeAll(async () => {
    await seedSessionStudent()
  })

  test.afterAll(async () => {
    await cleanupSessionStudent()
  })

  test('an expired access token is renewed while browsing / and /khoa-hoc', async ({
    page,
    context,
  }) => {
    await page.goto(`${SITE}/dang-nhap`)
    await page.locator('#login-email').fill(testSessionStudent.email)
    await page.locator('#login-password').fill(testSessionStudent.password)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()

    // Signed in: the header swaps the sign-in button for the account pill. Matched by href
    // rather than by text — the pill renders the student's own name, not a fixed label.
    const accountLink = page.locator('header a[href="/tai-khoan"]').first()
    await expect(accountLink).toBeVisible()
    await expect(page.locator('header a[href="/dang-nhap"]')).toHaveCount(0)

    await dropAccessCookie(context)

    // BUG-08: a public page must never be where the session is renewed — a shared cache would
    // store that visitor's token with the page. This pins `proxy`'s matcher; that a cookie
    // written anywhere carries `no-store` is `tests/int/proxy-session.spec.ts`'s job.
    const res = await context.request.get(`${SITE}/`)
    const setCookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie')
    expect(setCookies.filter((h) => h.value.startsWith('coursely-')).map((h) => h.value)).toEqual(
      [],
    )

    // Two public pages, neither of which reaches `proxy` any more.
    for (const path of ['/', '/khoa-hoc']) {
      await page.goto(`${SITE}${path}`)
      await expect(accountLink).toBeVisible()
    }

    // The renewal really happened, rather than the header merely looking right.
    expect((await context.cookies()).map((c) => c.name)).toContain(ACCESS_COOKIE)

    // And the session still opens the protected page it is supposed to.
    await page.goto(`${SITE}/tai-khoan`)
    await expect(page).toHaveURL(`${SITE}/tai-khoan`)
  })
})
