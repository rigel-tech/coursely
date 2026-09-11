// @vitest-environment node
// Renewal is now a signature check and a fresh signature — no datastore, no rotation.
// What these tests pin is the part that is easy to get wrong once there is no record to
// consult: which cookies come back on the response, and what happens to a visitor whose
// refresh token no longer verifies.

import { beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { proxy } from '@/proxy'
import { signAccessToken, signRefreshToken, verifyAccessToken } from '@/lib/auth/session-token'
import { REFRESH_TTL_SEC } from '@/lib/constants/auth'

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'
const PROTECTED = 'http://localhost/tai-khoan'
const ADMIN = 'http://localhost/admin'

let payload: Payload

const req = (cookie: string) => new NextRequest(PROTECTED, { headers: { cookie } })
const adminReq = (cookie: string) => new NextRequest(ADMIN, { headers: { cookie } })

const activeStudent = { id: 1, status: 'ACTIVE' }

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

describe('proxy — student session', () => {
  it('valid access token: serves the page and writes no cookie', async () => {
    const res = await proxy(req(`${ACCESS_COOKIE}=${signAccessToken(activeStudent)}`))

    expect(res.headers.get('location')).toBeNull()
    expect(res.cookies.get(ACCESS_COOKIE)).toBeUndefined()
    expect(res.cookies.get(REFRESH_COOKIE)).toBeUndefined()
  })

  it('no access token but a valid refresh: mints a new access cookie and serves the page', async () => {
    const refresh = signRefreshToken(activeStudent, REFRESH_TTL_SEC)

    const res = await proxy(req(`${REFRESH_COOKIE}=${refresh}`))

    expect(res.headers.get('location')).toBeNull()
    expect(verifyAccessToken(res.cookies.get(ACCESS_COOKIE)?.value)).toEqual(activeStudent)
  })

  it('renewal leaves the refresh cookie alone — the session is not rotated', async () => {
    const res = await proxy(
      req(`${REFRESH_COOKIE}=${signRefreshToken(activeStudent, REFRESH_TTL_SEC)}`),
    )

    expect(res.cookies.get(REFRESH_COOKIE)).toBeUndefined()
  })

  it('an unusable refresh token: redirects to sign-in and clears both cookies', async () => {
    const res = await proxy(req(`${REFRESH_COOKIE}=not.a.token`))

    expect(res.headers.get('location')).toContain('/dang-nhap?callbackUrl=')
    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBe('')
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe('')
  })

  it('an expired refresh token is no better than a forged one', async () => {
    const expired = signRefreshToken(activeStudent, -60)

    const res = await proxy(req(`${REFRESH_COOKIE}=${expired}`))

    expect(res.headers.get('location')).toContain('/dang-nhap?callbackUrl=')
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe('')
  })

  it('no cookies at all: redirects without trying to clear anything', async () => {
    const res = await proxy(new NextRequest(PROTECTED))

    expect(res.headers.get('location')).toContain('/dang-nhap?callbackUrl=')
    expect(res.cookies.get(ACCESS_COOKIE)).toBeUndefined()
  })

  it('a student who is not ACTIVE is not let into the student area', async () => {
    const pending = { id: 2, status: 'PENDING_VERIFICATION' }

    const res = await proxy(req(`${ACCESS_COOKIE}=${signAccessToken(pending)}`))

    expect(res.headers.get('location')).toContain('/dang-nhap?callbackUrl=')
  })
})

// Payload's own `canAccessAdmin` guards the panel, so `proxy` has no admin branch left and
// `/admin` is an ordinary path to it. What it must not become is a dead zone: the student
// session is renewed and cleared there exactly as it is everywhere else.
describe('proxy — /admin is an ordinary path for the student session', () => {
  it('renews the access cookie on /admin, like anywhere else', async () => {
    const refresh = signRefreshToken(activeStudent, REFRESH_TTL_SEC)

    const res = await proxy(adminReq(`${REFRESH_COOKIE}=${refresh}`))

    expect(res.headers.get('location')).toBeNull()
    expect(verifyAccessToken(res.cookies.get(ACCESS_COOKIE)?.value)).toEqual(activeStudent)
  })

  it('clears both cookies on /admin when the refresh token no longer verifies', async () => {
    const res = await proxy(adminReq(`${REFRESH_COOKIE}=not.a.token`))

    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBe('')
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe('')
  })
})

// `NextResponse.next({ request: { headers } })` is observable on the response as
// `x-middleware-override-headers` plus one `x-middleware-request-<name>` per header
// (see `next/dist/server/web/spec-extension/response.js`). A plain `NextResponse.next()`
// writes neither — which is exactly what "proxy does not touch request headers" means.
describe('proxy — identity is never forwarded as a request header', () => {
  it('a signed-in student: no x-user-* is written onto the forwarded request', async () => {
    const res = await proxy(req(`${ACCESS_COOKIE}=${signAccessToken(activeStudent)}`))

    expect(res.headers.get('x-middleware-request-x-user-id')).toBeNull()
    expect(res.headers.get('x-middleware-request-x-user-status')).toBeNull()
  })

  it('an x-user-id sent by the client passes through untouched — proxy rewrites nothing', async () => {
    const res = await proxy(
      new NextRequest('http://localhost/', { headers: { 'x-user-id': '999' } }),
    )

    expect(res.headers.get('x-middleware-override-headers')).toBeNull()
  })

  it('the Payload instance still boots — this spec would pass on a broken config otherwise', () => {
    expect(payload.config.collections.some((c) => c.slug === 'students')).toBe(true)
  })
})
