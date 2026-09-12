// @vitest-environment node
// jose 6 is WebCrypto-only and rejects jsdom's Uint8Array realm, so this spec cannot
// run under the config's default jsdom environment.
//
// Signing is async, and a Promise is always truthy: hand one to `jar.set` and the cookie
// is written as the string "[object Promise]" with nothing raised anywhere. Every visitor
// is then signed out, on a build that compiles and renders. These tests exist to make
// that failure loud — they assert the cookie carries a token that verifies, not merely
// that something was written.

import { describe, it, expect } from 'vitest'

import {
  setSessionCookies,
  refreshAccessCookie,
  clearSessionCookies,
} from '@/lib/auth/session-cookies'
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth/session-token'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, REFRESH_TTL_SEC } from '@/lib/constants/auth'

type Written = { name: string; value: string; options?: Record<string, unknown> }

/** The structural jar both `cookies()` and `NextResponse.cookies` satisfy. */
function fakeJar() {
  const written: Written[] = []
  const deleted: string[] = []
  return {
    written,
    deleted,
    set(name: string, value: string, options?: Record<string, unknown>) {
      written.push({ name, value, options })
    },
    delete(name: string) {
      deleted.push(name)
    },
    valueOf(name: string) {
      return written.find((entry) => entry.name === name)?.value
    },
  }
}

const claims = { id: 7, status: 'ACTIVE' }

describe('setSessionCookies', () => {
  it('writes both cookies as strings, not as pending promises', async () => {
    const jar = fakeJar()

    await setSessionCookies(jar, claims)

    expect(typeof jar.valueOf(ACCESS_TOKEN_COOKIE)).toBe('string')
    expect(typeof jar.valueOf(REFRESH_TOKEN_COOKIE)).toBe('string')
  })

  it('writes tokens that verify back to the claims they were given', async () => {
    const jar = fakeJar()

    await setSessionCookies(jar, claims)

    await expect(verifyAccessToken(jar.valueOf(ACCESS_TOKEN_COOKIE))).resolves.toEqual(claims)
    await expect(verifyRefreshToken(jar.valueOf(REFRESH_TOKEN_COOKIE))).resolves.toEqual(claims)
  })

  it('gives the refresh cookie the same lifetime as the token inside it', async () => {
    const jar = fakeJar()

    await setSessionCookies(jar, claims)

    const refresh = jar.written.find((entry) => entry.name === REFRESH_TOKEN_COOKIE)
    expect(refresh?.options?.maxAge).toBe(REFRESH_TTL_SEC)
  })
})

describe('refreshAccessCookie', () => {
  it('writes an access token that verifies, and touches nothing else', async () => {
    const jar = fakeJar()

    await refreshAccessCookie(jar, claims)

    expect(jar.written.map((entry) => entry.name)).toEqual([ACCESS_TOKEN_COOKIE])
    await expect(verifyAccessToken(jar.valueOf(ACCESS_TOKEN_COOKIE))).resolves.toEqual(claims)
  })
})

describe('clearSessionCookies', () => {
  it('drops both cookies', () => {
    const jar = fakeJar()

    clearSessionCookies(jar)

    expect(jar.deleted).toEqual([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE])
  })
})
