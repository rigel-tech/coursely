import { describe, expect, it } from 'vitest'
import { parseForgotPasswordInput } from '@/lib/validation/forgot-password-schema'

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const res = parseForgotPasswordInput({ email: 'student@example.com' })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.email).toBe('student@example.com')
    }
  })

  it('trims whitespace around email', () => {
    const res = parseForgotPasswordInput({ email: '  student@example.com  ' })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.email).toBe('student@example.com')
    }
  })

  it('rejects empty email', () => {
    const res = parseForgotPasswordInput({ email: '' })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.fieldErrors.email).toBeDefined()
    }
  })

  it('rejects malformed email', () => {
    const res = parseForgotPasswordInput({ email: 'not-an-email' })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.fieldErrors.email).toBeDefined()
    }
  })
})
