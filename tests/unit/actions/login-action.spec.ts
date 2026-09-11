// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const ctx = vi.hoisted(() => ({ jar: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (ctx.jar.has(name) ? { name, value: ctx.jar.get(name) } : undefined),
    set: (name: string, value: string) => {
      ctx.jar.set(name, value)
    },
    delete: (name: string) => ctx.jar.delete(name),
  }),
}))

const authenticateStudent = vi.fn()

// Only the service is mocked — it reaches for the Payload config, which a unit test has no
// business booting (`tests/int/student-login.spec.ts` is where that runs for real). The
// error classes come from their own module and stay real, so the `instanceof` branches
// exercised here are the ones that ship.
vi.mock('@/services/student-login', () => ({
  authenticateStudent: (...args: unknown[]) => authenticateStudent(...args),
}))

const { EmailNotVerified, LoginRefused } = await import('@/lib/errors/auth')
const { loginAction } = await import('@/actions/auth/login')

const credentials = { email: 'a@b.com', password: 'secret12' }

describe('loginAction — an error it does not recognise', () => {
  it('rethrows it rather than flattening it into a banner', async () => {
    authenticateStudent.mockRejectedValue(new Error('database is on fire'))

    await expect(loginAction(credentials)).rejects.toThrow('database is on fire')
  })
})

describe('loginAction — the refusals it does have copy for', () => {
  it("shows LoginRefused's own message, which is already written for the reader", async () => {
    authenticateStudent.mockRejectedValue(new LoginRefused('Tài khoản đã bị khóa.'))

    expect(await loginAction(credentials)).toEqual({
      status: 'error',
      message: 'Tài khoản đã bị khóa.',
    })
  })

  it('turns EmailNotVerified into the OTP bounce, cookie and all', async () => {
    ctx.jar.clear()
    authenticateStudent.mockRejectedValue(new EmailNotVerified('a@b.com'))

    expect(await loginAction(credentials)).toMatchObject({
      status: 'error',
      redirectTo: '/xac-thuc-otp',
    })
    expect(ctx.jar.get('pending_email')).toBe('a@b.com')
  })
})
