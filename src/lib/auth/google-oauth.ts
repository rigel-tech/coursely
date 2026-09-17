const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

export interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name: string
  picture?: string
  given_name?: string
  family_name?: string
}

export interface GoogleTokens {
  access_token: string
  expires_in: number
  id_token: string
  scope: string
  token_type: string
  refresh_token?: string
}

export function resolveOAuthOrigin(headers: Headers, fallbackOrigin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '')
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl
  }

  const proto =
    headers.get('x-forwarded-proto') ||
    (headers.get('referer')?.startsWith('https') ? 'https' : 'https')
  const host = headers.get('x-forwarded-host') || headers.get('host')
  if (host) {
    return `${proto}://${host}`
  }

  const originHeader = headers.get('origin')?.replace(/\/$/, '')
  if (originHeader) {
    return originHeader
  }

  return fallbackOrigin?.replace(/\/$/, '') || envUrl || 'http://localhost:3000'
}

export function getGoogleOAuthConfig(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được thiết lập trong .env')
  }

  return { clientId, clientSecret, redirectUri }
}

export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const { clientId } = getGoogleOAuthConfig(redirectUri)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'online',
    prompt: 'select_account',
  })

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
}

export async function exchangeCodeForGoogleTokens(
  code: string,
  redirectUri: string,
): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getGoogleOAuthConfig(redirectUri)

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const errorData = await res.text()
    throw new Error(`Lỗi khi đổi Google authorization code: ${res.status} - ${errorData}`)
  }

  return (await res.json()) as GoogleTokens
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const errorData = await res.text()
    throw new Error(`Lỗi khi lấy thông tin người dùng từ Google: ${res.status} - ${errorData}`)
  }

  return (await res.json()) as GoogleUserInfo
}
