import { describe, it, expect } from 'vitest'

import { parseRegisterInput } from '@/lib/validation/register-schema'

const valid = {
  email: 'alice@example.com',
  password: 'abcd1234',
  confirmPassword: 'abcd1234',
  fullName: 'Alice',
  phone: '',
  terms: 'on',
}

describe('parseRegisterInput', () => {
  it('accepts a well-formed submission', () => {
    const result = parseRegisterInput(valid)
    expect(result.success).toBe(true)
  })

  it('rejects a malformed email', () => {
    const result = parseRegisterInput({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors.email).toBeTruthy()
  })

  it('rejects a password under 8 characters', () => {
    const result = parseRegisterInput({ ...valid, password: 'ab12', confirmPassword: 'ab12' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors.password).toBeTruthy()
  })

  it('rejects a password with no digit', () => {
    const result = parseRegisterInput({
      ...valid,
      password: 'abcdefgh',
      confirmPassword: 'abcdefgh',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors.password).toBeTruthy()
  })

  it('rejects a password with no letter', () => {
    const result = parseRegisterInput({
      ...valid,
      password: '12345678',
      confirmPassword: '12345678',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors.password).toBeTruthy()
  })

  it('flags confirmPassword when the two do not match', () => {
    const result = parseRegisterInput({ ...valid, confirmPassword: 'abcd9999' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors.confirmPassword).toBeTruthy()
  })

  it('requires the terms checkbox', () => {
    const result = parseRegisterInput({ ...valid, terms: undefined })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.fieldErrors.terms).toBeTruthy()
  })
})
