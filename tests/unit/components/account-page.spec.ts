// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const getSessionStudent = vi.fn()
vi.mock('@/lib/auth/session-student', () => ({
  getSessionStudent: () => getSessionStudent(),
}))

const redirect = vi.fn((to: string) => {
  // The real one throws a navigation marker, so nothing after it runs. Mirroring that
  // keeps the page's control flow honest instead of letting it fall through to render.
  throw new Error(`NEXT_REDIRECT:${to}`)
})
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to) }))

const ProfilePage = (await import('@/app/(frontend)/student/account/page')).default

const SIGN_IN = '/dang-nhap?callbackUrl=%2Ftai-khoan'

const visit = () => ProfilePage().catch(() => undefined)

describe('the account page turns an unusable session away', () => {
  // `route-guard` sends a blocked visitor to the sign-in page carrying where they meant to
  // go. This page is the second gate on the same door and used to send them to the home
  // page instead, where they had to find the sign-in control themselves.
  it('sends a signed-out visitor to the sign-in page, keeping the destination', async () => {
    getSessionStudent.mockResolvedValue(null)

    await visit()

    expect(redirect).toHaveBeenCalledWith(SIGN_IN)
  })

  it('sends an account that is not ACTIVE to the same place', async () => {
    redirect.mockClear()
    getSessionStudent.mockResolvedValue({ id: 1, status: 'PENDING_VERIFICATION' })

    await visit()

    expect(redirect).toHaveBeenCalledWith(SIGN_IN)
  })

  it('lets an ACTIVE account through without redirecting', async () => {
    redirect.mockClear()
    getSessionStudent.mockResolvedValue({ id: 1, status: 'ACTIVE' })

    await visit()

    expect(redirect).not.toHaveBeenCalled()
  })
})
