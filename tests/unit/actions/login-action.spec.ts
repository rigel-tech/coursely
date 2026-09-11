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

// The real service reaches for the Payload config, which a unit test has no business
// booting — `tests/int/student-login.spec.ts` is where that runs for real. The two error
// classes are stubbed alongside it so the action's `instanceof` branches still resolve;
// the plain `Error` these tests throw must match neither of them.
vi.mock('@/services/student-login', () => ({
  authenticateStudent: (...args: unknown[]) => authenticateStudent(...args),
  LoginRefused: class LoginRefused extends Error {},
  EmailNotVerified: class EmailNotVerified extends Error {},
}))

const { loginAction } = await import('@/actions/auth/login')

describe('loginAction — an error it does not recognise', () => {
  it('rethrows it rather than flattening it into a banner', async () => {
    authenticateStudent.mockRejectedValue(new Error('database is on fire'))

    await expect(loginAction({ email: 'a@b.com', password: 'secret12' })).rejects.toThrow(
      'database is on fire',
    )
  })
})
