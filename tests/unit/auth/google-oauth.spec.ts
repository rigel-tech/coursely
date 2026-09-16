import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildGoogleAuthUrl,
  exchangeCodeForGoogleTokens,
  fetchGoogleUserInfo,
} from '@/lib/auth/google-oauth'

describe('google-oauth', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('1. Tạo đúng URL Google OAuth với đầy đủ tham số', () => {
    const state = 'secure-random-state-123'
    const redirectUri = 'http://localhost:3000/api/auth/google/callback'

    const urlString = buildGoogleAuthUrl(state, redirectUri)
    const url = new URL(urlString)

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com')
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('openid email profile')
    expect(url.searchParams.get('state')).toBe(state)
  })

  it('2. Đổi authorization code lấy token thành công', async () => {
    const mockTokens = {
      access_token: 'mock-access-token',
      expires_in: 3600,
      id_token: 'mock-id-token',
      scope: 'openid email profile',
      token_type: 'Bearer',
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokens,
      }),
    )

    const result = await exchangeCodeForGoogleTokens('test-code', 'http://localhost:3000/callback')
    expect(result.access_token).toBe('mock-access-token')
  })

  it('3. Lấy thông tin userinfo thành công', async () => {
    const mockUser = {
      sub: 'google-user-123',
      email: 'student@example.com',
      email_verified: true,
      name: 'Nguyen Van A',
      picture: 'https://example.com/avatar.jpg',
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      }),
    )

    const user = await fetchGoogleUserInfo('mock-access-token')
    expect(user.email).toBe('student@example.com')
    expect(user.email_verified).toBe(true)
    expect(user.name).toBe('Nguyen Van A')
  })
})
