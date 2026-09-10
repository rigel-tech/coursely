// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { proxy } from '@/proxy'
import { createSession, renewSession } from '@/services/session-store'
import { hashRefreshToken, signAccessToken } from '@/services/session-token'
import { redis } from '@/lib/redis'
import { SessionScope } from './helpers/session-keys'

const ACCESS_COOKIE = 'coursely-access'
const REFRESH_COOKIE = 'coursely-refresh'
const PROTECTED = 'http://localhost/tai-khoan'

let payload: Payload
let uid = 0
const scope = new SessionScope()
const users: number[] = []

const makeUser = async () => {
  const email = `proxy-${Date.now()}-${uid++}-${Math.random().toString(36).slice(2)}@example.com`
  const u = await payload.create({
    collection: 'students',
    data: { email, password: 'Secret123', status: 'ACTIVE' },
  })
  users.push(u.id as number)
  scope.user(u.id as number)
  return u
}

const req = (cookie: string) => new NextRequest(PROTECTED, { headers: { cookie } })

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  await scope.cleanup()
  for (const id of users.splice(0)) {
    await payload.delete({ collection: 'students', id })
  }
})

describe('proxy — student session', () => {
  it('valid access token: serves the page, no renewal, no Set-Cookie', async () => {
    const user = await makeUser()
    const access = signAccessToken({ sub: user.id as number, status: 'ACTIVE' })

    const res = await proxy(req(`${ACCESS_COOKIE}=${access}`))

    expect(res.headers.get('location')).toBeNull()
    expect(res.cookies.get(ACCESS_COOKIE)).toBeUndefined()
    expect(res.cookies.get(REFRESH_COOKIE)).toBeUndefined()
  })

  it('no access token but a valid refresh: renews inline, serves authenticated, sets fresh cookies', async () => {
    const user = await makeUser()
    const issued = await createSession(
      { id: user.id as number, status: 'ACTIVE' },
      { ip: '10.0.0.9', userAgent: 'seed' },
      { rememberMe: true },
    )

    const res = await proxy(req(`${REFRESH_COOKIE}=${issued.refreshRaw}`))

    expect(res.headers.get('location')).toBeNull()
    const newAccess = res.cookies.get(ACCESS_COOKIE)?.value
    const newRefresh = res.cookies.get(REFRESH_COOKIE)?.value
    expect(newAccess).toBeTruthy()
    expect(newRefresh).toBeTruthy()
    expect(newRefresh).not.toBe(issued.refreshRaw)
  })

  it('a reused refresh token: redirects to sign-in and clears both cookies', async () => {
    const user = await makeUser()
    const issued = await createSession(
      { id: user.id as number, status: 'ACTIVE' },
      { ip: '10.0.0.9', userAgent: 'seed' },
      { rememberMe: true },
    )
    const captured = issued.refreshRaw
    const sid = (await redis.get(`refresh:${hashRefreshToken(captured)}`))!
    await renewSession(captured, { ip: 'x', userAgent: 'y' }) // legit rotation
    await redis.del(`race:${sid}`) // fast-forward past the grace window

    const res = await proxy(req(`${REFRESH_COOKIE}=${captured}`))

    // `decideRoute` sends a signed-out visitor to the sign-in page, carrying the path
    // it bounced them off. This asserted `/?callbackUrl=` — the shape `account/page.tsx`
    // uses — from before the guard owned that redirect.
    expect(res.headers.get('location')).toContain('/dang-nhap?callbackUrl=')
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
    const user = await makeUser()
    const access = signAccessToken({ sub: user.id as number, status: 'ACTIVE' })

    const res = await proxy(req(`${ACCESS_COOKIE}=${access}`))

    expect(res.headers.get('x-middleware-request-x-user-id')).toBeNull()
    expect(res.headers.get('x-middleware-request-x-user-status')).toBeNull()
  })

  it('an x-user-id sent by the client passes through untouched — proxy rewrites nothing', async () => {
    const res = await proxy(
      new NextRequest('http://localhost/', { headers: { 'x-user-id': '999' } }),
    )

    expect(res.headers.get('x-middleware-override-headers')).toBeNull()
  })
})
