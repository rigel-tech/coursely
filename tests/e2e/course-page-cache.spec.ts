import { test, expect } from '@playwright/test'

const SITE = 'http://localhost:3000'

/**
 * The one check that the course detail page is really served from cache. Everything else about
 * it — `course-page-static.spec.ts` included — reads source; only a production server shows
 * what Next decided. `next dev` sends `no-store` on every page, so this skips there.
 *
 * Run against `pnpm build && pnpm start` on :3000 (Playwright reuses it) with `E2E_PROD=1`.
 */
test.describe('the course detail page on a production build', () => {
  test.skip(!process.env.E2E_PROD, 'needs `pnpm build && pnpm start` and E2E_PROD=1')

  test('is served shared-cacheable', async ({ request }) => {
    const listing = await (await request.get(`${SITE}/khoa-hoc`)).text()
    const slug = listing.match(/href="\/khoa-hoc\/([^"/?#]+)"/)?.[1]
    expect(slug, 'no published course linked from /khoa-hoc').toBeTruthy()

    // Twice: an on-demand page is rendered by the first request and cached for the second.
    await request.get(`${SITE}/khoa-hoc/${slug}`)
    const res = await request.get(`${SITE}/khoa-hoc/${slug}`)

    expect(res.status()).toBe(200)
    expect(res.headers()['cache-control']).not.toMatch(/no-store|private/)
  })
})
