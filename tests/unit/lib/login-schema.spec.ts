import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { loginInputSchema, safeCallbackUrl } from '@/lib/validation/login-schema'

/** The per-field messages `zodResolver` hands the form, read the way the form reads them. */
const fieldErrors = (raw: unknown) => {
  const parsed = loginInputSchema.safeParse(raw)
  return parsed.success ? {} : z.flattenError(parsed.error).fieldErrors
}

describe('loginInputSchema', () => {
  it('accepts a pair and trims the address', () => {
    expect(loginInputSchema.safeParse({ email: ' a@b.com ', password: 'secret' })).toMatchObject({
      success: true,
      data: { email: 'a@b.com', password: 'secret' },
    })
  })

  it('no longer carries rememberMe — a stray one is dropped, never honoured', () => {
    const parsed = loginInputSchema.safeParse({
      email: 'a@b.com',
      password: 'secret',
      rememberMe: true,
    })

    expect(parsed.success).toBe(true)
    expect(parsed.success && 'rememberMe' in parsed.data).toBe(false)
  })

  it('reports specific field errors for blank or invalid inputs', () => {
    expect(fieldErrors({ email: 'a@b.com', password: '' })).toEqual({
      password: ['Vui lòng nhập mật khẩu'],
    })
    expect(fieldErrors({ email: 'nope', password: 'x' })).toEqual({
      email: ['Email không đúng định dạng'],
    })
    expect(fieldErrors({ email: '', password: '' })).toEqual({
      email: ['Vui lòng nhập email'],
      password: ['Vui lòng nhập mật khẩu'],
    })
  })

  it('keeps a same-site callbackUrl and drops an off-site one', () => {
    expect(
      loginInputSchema.safeParse({ email: 'a@b.com', password: 'x', callbackUrl: '/khoa-hoc' }),
    ).toMatchObject({ success: true, data: { callbackUrl: '/khoa-hoc' } })

    for (const callbackUrl of ['https://evil.com', '//evil.com']) {
      const parsed = loginInputSchema.safeParse({ email: 'a@b.com', password: 'x', callbackUrl })
      expect(parsed.success).toBe(true)
      expect(parsed.success ? parsed.data.callbackUrl : 'did not parse').toBeUndefined()
    }
  })

  it('takes the null the client reads off the URL', () => {
    expect(
      loginInputSchema.safeParse({ email: 'a@b.com', password: 'x', callbackUrl: null }),
    ).toMatchObject({ success: true })
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

  // Resolving through `URL` normalises what the regex used to hand back verbatim. Asserted
  // so the change is a decision on record: callers get the resolved path, not their input.
  it('returns the resolved path, query and hash', () => {
    expect(safeCallbackUrl('/a/../b')).toBe('/b')
    expect(safeCallbackUrl('/a?x=1#y')).toBe('/a?x=1#y')
  })
})
