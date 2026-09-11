// @vitest-environment node
import { APIError } from 'payload'
import { describe, expect, it } from 'vitest'

import { EmailNotVerified, LoginRefused } from '@/lib/errors/auth'

// Until these moved out of the service, the only thing checking them was an integration
// spec that needs Postgres. What they are — an APIError, with a status, carrying a message
// written for the reader — costs no database to assert, so it should not need one.
describe('LoginRefused', () => {
  it('is an APIError, so an instanceof APIError branch would also catch it', () => {
    const err = new LoginRefused('Tài khoản đã bị khóa.')

    expect(err).toBeInstanceOf(APIError)
    expect(err).toBeInstanceOf(Error)
  })

  it('keeps the caller message verbatim — it is the copy the form renders', () => {
    expect(new LoginRefused('Thử lại sau 10:30.').message).toBe('Thử lại sau 10:30.')
  })

  it('answers 403: the credentials were right, the account was not allowed', () => {
    expect(new LoginRefused('x').status).toBe(403)
  })
})

describe('EmailNotVerified', () => {
  it('carries the address, which is what the OTP flow needs off it', () => {
    expect(new EmailNotVerified('a@b.com').email).toBe('a@b.com')
  })

  it('brings its own message rather than taking one', () => {
    expect(new EmailNotVerified('a@b.com').message).toMatch(/chưa xác minh/)
  })

  it('is an APIError with the same 403', () => {
    const err = new EmailNotVerified('a@b.com')

    expect(err).toBeInstanceOf(APIError)
    expect(err.status).toBe(403)
  })
})

describe('the two are distinguishable', () => {
  // The action branches on these in order. If one ever extended the other, the first
  // branch would swallow the second and the OTP bounce would silently become a banner.
  it('neither is an instance of the other', () => {
    expect(new LoginRefused('x')).not.toBeInstanceOf(EmailNotVerified)
    expect(new EmailNotVerified('a@b.com')).not.toBeInstanceOf(LoginRefused)
  })
})
