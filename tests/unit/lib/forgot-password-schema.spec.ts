import { describe, expect, it } from 'vitest'
import { emailSchema, forgotPasswordSchema } from '@/lib/validation/forgot-password-schema'

// What `forgotPasswordAction` calls directly — the address, nothing wrapped around it.
describe('emailSchema', () => {
  it('accepts valid email', () => {
    const res = emailSchema.safeParse('student@example.com')
    expect(res.success).toBe(true)
    if (res.success) expect(res.data).toBe('student@example.com')
  })

  it('trims whitespace around email', () => {
    const res = emailSchema.safeParse('  student@example.com  ')
    expect(res.success).toBe(true)
    if (res.success) expect(res.data).toBe('student@example.com')
  })

  it('rejects empty email', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
  })

  it('rejects malformed email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
  })
})

// What `<ForgotPasswordForm>`'s `zodResolver` runs — the same rule, wrapped in an object
// because `register('email')` needs a field name to bind to.
describe('forgotPasswordSchema', () => {
  it('accepts a well-formed submission', () => {
    const res = forgotPasswordSchema.safeParse({ email: 'student@example.com' })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.email).toBe('student@example.com')
  })

  it('rejects a malformed email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(false)
  })
})
