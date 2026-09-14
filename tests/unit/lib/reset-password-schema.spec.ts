import { describe, expect, it } from 'vitest'
import {
  resetPasswordFormSchema,
  resetPasswordSchema,
} from '@/lib/validation/reset-password-schema'

// What `resetPasswordAction` validates directly — token + password + confirmPassword.
describe('resetPasswordSchema', () => {
  it('accepts valid password matching requirements', () => {
    const res = resetPasswordSchema.safeParse({
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
    const res = resetPasswordSchema.safeParse({
      token: 'valid-token-123',
      password: 'Pass1',
      confirmPassword: 'Pass1',
    })
    expect(res.success).toBe(false)
  })

  it('rejects password without numbers', () => {
    const res = resetPasswordSchema.safeParse({
      token: 'valid-token-123',
      password: 'PasswordOnly',
      confirmPassword: 'PasswordOnly',
    })
    expect(res.success).toBe(false)
  })

  it('rejects mismatched password and confirmPassword', () => {
    const res = resetPasswordSchema.safeParse({
      token: 'valid-token-123',
      password: 'Password123',
      confirmPassword: 'DifferentPassword123',
    })
    expect(res.success).toBe(false)
  })

  it('rejects a missing token', () => {
    const res = resetPasswordSchema.safeParse({
      token: '',
      password: 'Password123',
      confirmPassword: 'Password123',
    })
    expect(res.success).toBe(false)
  })
})

// What `<ResetPasswordForm>`'s `zodResolver` runs — the token isn't a field the person
// types (it comes off the URL, and the page shows a different card entirely when it's
// missing), so the form's own schema only covers the two fields it renders.
describe('resetPasswordFormSchema', () => {
  it('accepts a well-formed submission', () => {
    expect(
      resetPasswordFormSchema.safeParse({ password: 'Password123', confirmPassword: 'Password123' })
        .success,
    ).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    expect(
      resetPasswordFormSchema.safeParse({
        password: 'Password123',
        confirmPassword: 'DifferentPassword123',
      }).success,
    ).toBe(false)
  })
})
