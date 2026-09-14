import { describe, it, expect } from 'vitest'

import { registerInputSchema } from '@/lib/validation/register-schema'

const valid = {
  email: 'alice@example.com',
  password: 'abcd1234',
  confirmPassword: 'abcd1234',
  fullName: 'Alice',
}

const parse = (raw: unknown) => registerInputSchema.safeParse(raw)

describe('registerInputSchema', () => {
  it('accepts a well-formed submission', () => {
    expect(parse(valid).success).toBe(true)
  })

  it('rejects a malformed email', () => {
    expect(parse({ ...valid, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects a password under 8 characters', () => {
    expect(parse({ ...valid, password: 'ab12', confirmPassword: 'ab12' }).success).toBe(false)
  })

  it('rejects a password with no digit', () => {
    expect(parse({ ...valid, password: 'abcdefgh', confirmPassword: 'abcdefgh' }).success).toBe(
      false,
    )
  })

  it('rejects a password with no letter', () => {
    expect(parse({ ...valid, password: '12345678', confirmPassword: '12345678' }).success).toBe(
      false,
    )
  })

  it('flags confirmPassword when the two do not match', () => {
    expect(parse({ ...valid, confirmPassword: 'abcd9999' }).success).toBe(false)
  })

  // Consent was dropped from registration, so a submission carrying no `terms` at all is the
  // normal one. Left as its own case because the field used to be required: a schema that
  // still demanded it would fail nothing else here, since every other case sends a full form.
  it('asks for no terms consent', () => {
    expect(parse({ ...valid, terms: undefined }).success).toBe(true)
  })

  it('trims a blank fullName and phone down to undefined, not an empty string', () => {
    const result = parse({ ...valid, fullName: '   ', phone: '   ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBeUndefined()
      expect(result.data.phone).toBeUndefined()
    }
  })

  it('accepts an optional phone a non-form caller sends', () => {
    const result = parse({ ...valid, phone: '0900000000' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('0900000000')
  })
})
