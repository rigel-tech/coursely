import { describe, expect, it } from 'vitest'
import { parseResetPasswordInput } from '@/lib/validation/reset-password-schema'

describe('resetPasswordSchema', () => {
  it('accepts valid password matching requirements', () => {
    const res = parseResetPasswordInput({
      token: 'valid-token-123',
      password: 'Password123',
      confirmPassword: 'Password123',
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.token).toBe('valid-token-123')
      expect(res.data.password).toBe('Password123')
    }
  })

  it('rejects password shorter than 8 characters', () => {
    const res = parseResetPasswordInput({
      token: 'valid-token-123',
      password: 'Pass1',
      confirmPassword: 'Pass1',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.fieldErrors.password).toContain('tối thiểu 8 ký tự')
    }
  })

  it('rejects password without numbers', () => {
    const res = parseResetPasswordInput({
      token: 'valid-token-123',
      password: 'PasswordOnly',
      confirmPassword: 'PasswordOnly',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.fieldErrors.password).toBeDefined()
    }
  })

  it('rejects mismatched password and confirmPassword', () => {
    const res = parseResetPasswordInput({
      token: 'valid-token-123',
      password: 'Password123',
      confirmPassword: 'DifferentPassword123',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.fieldErrors.confirmPassword).toContain('không khớp')
    }
  })

  it('rejects missing token', () => {
    const res = parseResetPasswordInput({
      token: '',
      password: 'Password123',
      confirmPassword: 'Password123',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.fieldErrors.token).toBeDefined()
    }
  })
})
