import { describe, it, expect } from 'vitest'

import { parseLoginInput, safeCallbackUrl } from '@/lib/validation/login-schema'

describe('parseLoginInput', () => {
  it('accepts a valid pair and returns only email, password and callbackUrl', () => {
    expect(parseLoginInput({ email: 'a@b.com', password: 'secret' })).toEqual({
      success: true,
      data: { email: 'a@b.com', password: 'secret', callbackUrl: undefined },
    })
  })

  it('does not carry a rememberMe field', () => {
    const r = parseLoginInput({ email: 'a@b.com', password: 'secret', rememberMe: 'on' })
    expect(r.success && 'rememberMe' in r.data).toBe(false)
  })

  it('rejects a blank password and a malformed email without revealing which', () => {
    expect(parseLoginInput({ email: 'a@b.com', password: '' }).success).toBe(false)
    expect(parseLoginInput({ email: 'nope', password: 'x' }).success).toBe(false)
  })

  it('keeps a same-site callbackUrl and drops an off-site one', () => {
    expect(
      parseLoginInput({ email: 'a@b.com', password: 'x', callbackUrl: '/khoa-hoc' }),
    ).toMatchObject({ success: true, data: { callbackUrl: '/khoa-hoc' } })

    const proto = parseLoginInput({
      email: 'a@b.com',
      password: 'x',
      callbackUrl: 'https://evil.com',
    })
    expect(proto.success && proto.data.callbackUrl).toBeUndefined()

    const schemeless = parseLoginInput({
      email: 'a@b.com',
      password: 'x',
      callbackUrl: '//evil.com',
    })
    expect(schemeless.success && schemeless.data.callbackUrl).toBeUndefined()
  })
})

describe('safeCallbackUrl', () => {
  it('passes /path, rejects //host, protocol URLs and non-strings', () => {
    expect(safeCallbackUrl('/a/b')).toBe('/a/b')
    expect(safeCallbackUrl('//evil.com')).toBeUndefined()
    expect(safeCallbackUrl('https://evil.com')).toBeUndefined()
    expect(safeCallbackUrl('relative')).toBeUndefined()
    expect(safeCallbackUrl(123)).toBeUndefined()
  })
})
