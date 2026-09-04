import { describe, it, expect } from 'vitest'

import { decideRoute } from '@/lib/auth/route-guard'
import type { AuthUser } from '@/lib/auth/verify-token'

const admin: AuthUser = { id: 1, role: 'ADMIN', status: 'ACTIVE' }
const student: AuthUser = { id: 2, role: 'STUDENT', status: 'ACTIVE' }
const pending: AuthUser = { id: 3, role: 'STUDENT', status: 'PENDING_VERIFICATION' }

describe('decideRoute — /admin', () => {
  it('bounces a signed-in non-admin to /', () => {
    expect(decideRoute('/admin/collections/users', student, false)).toEqual({
      type: 'redirect',
      to: '/',
    })
  })

  it('lets an admin through', () => {
    expect(decideRoute('/admin', admin, false)).toEqual({ type: 'next' })
  })

  it("leaves an anonymous visitor to Payload's own login", () => {
    expect(decideRoute('/admin/login', null, false)).toEqual({ type: 'next' })
  })
})

describe('decideRoute — /verify-otp', () => {
  it('redirects home without the pending_email cookie', () => {
    expect(decideRoute('/verify-otp', null, false)).toEqual({ type: 'redirect', to: '/' })
  })

  it('passes through with the cookie', () => {
    expect(decideRoute('/verify-otp', null, true)).toEqual({ type: 'next' })
  })
})

describe('decideRoute — protected student area', () => {
  it('redirects an anonymous visitor to / with the callbackUrl', () => {
    expect(decideRoute('/tai-khoan', null, false)).toEqual({
      type: 'redirect',
      to: '/?callbackUrl=%2Ftai-khoan',
    })
  })

  it('redirects a not-yet-verified account, keeping the deep path', () => {
    expect(decideRoute('/khoa-hoc-cua-toi/abc', pending, false)).toEqual({
      type: 'redirect',
      to: '/?callbackUrl=%2Fkhoa-hoc-cua-toi%2Fabc',
    })
  })

  it('lets an active account through', () => {
    expect(decideRoute('/tai-khoan/settings', student, false)).toEqual({ type: 'next' })
  })

  it('does not match a look-alike prefix', () => {
    expect(decideRoute('/tai-khoan-cong-khai', null, false)).toEqual({ type: 'next' })
  })
})

describe('decideRoute — everything else', () => {
  it('passes public routes through', () => {
    expect(decideRoute('/', null, false)).toEqual({ type: 'next' })
    expect(decideRoute('/posts/hello', null, false)).toEqual({ type: 'next' })
  })
})
