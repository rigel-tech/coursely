import { describe, it, expect } from 'vitest'

import { decideRoute } from '@/lib/auth/route-guard'
import type { RoutePrincipal } from '@/lib/auth/route-guard'

const staff: RoutePrincipal = { id: 1, status: 'ACTIVE' }
const student: RoutePrincipal = { id: 2, status: 'ACTIVE' }
const pending: RoutePrincipal = { id: 3, status: 'PENDING_VERIFICATION' }

// The admin branch is gone: Payload's own `canAccessAdmin` — backed by
// `Students.access.admin` — guards the panel on every request to it, and nothing in this
// module is asked. Routing never was authorisation; this asserts it has stopped pretending
// to be.
describe('decideRoute — /admin is no longer routed here', () => {
  it('passes through for a signed-in principal', () => {
    expect(decideRoute('/admin', staff, false)).toEqual({ type: 'next' })
    expect(decideRoute('/admin/collections/users', staff, false)).toEqual({ type: 'next' })
  })

  it("passes through for an anonymous visitor, leaving Payload's own login to answer", () => {
    expect(decideRoute('/admin/login', null, false)).toEqual({ type: 'next' })
  })

  it('never redirects an /admin path, whoever is asking', () => {
    for (const user of [null, staff, student, pending]) {
      expect(decideRoute('/admin/collections/posts', user, false)).toEqual({ type: 'next' })
    }
  })
})

describe('decideRoute — /xac-thuc-otp', () => {
  it('redirects home without the pending_email cookie', () => {
    expect(decideRoute('/xac-thuc-otp', null, false)).toEqual({ type: 'redirect', to: '/' })
  })

  it('passes through with the cookie', () => {
    expect(decideRoute('/xac-thuc-otp', null, true)).toEqual({ type: 'next' })
  })
})

describe('decideRoute — protected student area', () => {
  it('redirects an anonymous visitor to /dang-nhap with the callbackUrl', () => {
    expect(decideRoute('/tai-khoan', null, false)).toEqual({
      type: 'redirect',
      to: '/dang-nhap?callbackUrl=%2Ftai-khoan',
    })
  })

  it('redirects a not-yet-verified account, keeping the deep path', () => {
    expect(decideRoute('/khoa-hoc-cua-toi/abc', pending, false)).toEqual({
      type: 'redirect',
      to: '/dang-nhap?callbackUrl=%2Fkhoa-hoc-cua-toi%2Fabc',
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
