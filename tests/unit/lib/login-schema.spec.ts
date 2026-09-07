import { describe, it, expect } from 'vitest'

import { parseLoginInput, safeCallbackUrl } from '@/lib/validation/login-schema'

describe('parseLoginInput', () => {
  it('accepts a valid pair and reads rememberMe from the checkbox value', () => {
    expect(parseLoginInput({ email: 'a@b.com', password: 'secret', rememberMe: 'on' })).toEqual({
      success: true,
      data: { email: 'a@b.com', password: 'secret', rememberMe: true },
    })
  })

  it('defaults rememberMe to false when the checkbox is absent', () => {
    const r = parseLoginInput({ email: 'a@b.com', password: 'secret' })
    expect(r.success && r.data.rememberMe).toBe(false)
  })

  it('reports specific field errors for blank or invalid inputs', () => {
    expect(parseLoginInput({ email: 'a@b.com', password: '' })).toEqual({
      success: false,
      fieldErrors: { password: 'Vui lòng nhập mật khẩu' },
    })
    expect(parseLoginInput({ email: 'nope', password: 'x' })).toEqual({
      success: false,
      fieldErrors: { email: 'Email không đúng định dạng' },
    })
    expect(parseLoginInput({ email: '', password: '' })).toEqual({
      success: false,
      fieldErrors: {
        email: 'Vui lòng nhập email',
        password: 'Vui lòng nhập mật khẩu',
      },
    })
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
