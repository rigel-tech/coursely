import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCodeForGoogleTokens, fetchGoogleUserInfo } from '@/lib/auth/google-oauth'
import { handleGoogleStudentAuth } from '@/services/student-google-auth'
import { setSessionCookies } from '@/lib/auth/session-cookies'
import { PENDING_EMAIL_COOKIE, PENDING_EMAIL_TTL_SEC } from '@/lib/constants/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const origin = request.nextUrl.origin

  const entryPath = request.cookies.get('oauth_entry_path')?.value
  const fallbackUrl = `${origin}${entryPath}`

  if (error) {
    const response = NextResponse.redirect(`${fallbackUrl}?error=google_auth_cancelled`)
    cleanupOAuthCookies(response)
    return response
  }

  const storedState = request.cookies.get('oauth_state')?.value
  const callbackUrl = request.cookies.get('oauth_callback_url')?.value || '/'

  if (!code || !state || !storedState || state !== storedState) {
    const response = NextResponse.redirect(`${fallbackUrl}?error=invalid_state`)
    cleanupOAuthCookies(response)
    return response
  }

  try {
    const redirectUri = `${origin}/api/auth/google`

    const tokens = await exchangeCodeForGoogleTokens(code, redirectUri)

    const googleUser = await fetchGoogleUserInfo(tokens.access_token)

    const outcome = await handleGoogleStudentAuth(googleUser)

    if (outcome.kind === 'disabled') {
      const response = NextResponse.redirect(`${fallbackUrl}?error=account_disabled`)
      cleanupOAuthCookies(response)
      return response
    }

    if (outcome.kind === 'requires_otp') {
      const response = NextResponse.redirect(`${origin}/xac-thuc-otp`)
      response.cookies.set(PENDING_EMAIL_COOKIE, outcome.email, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: PENDING_EMAIL_TTL_SEC,
        secure: process.env.NODE_ENV === 'production',
      })
      cleanupOAuthCookies(response)
      return response
    }

    const destination = callbackUrl.startsWith('/')
      ? `${origin}${callbackUrl}`
      : `${origin}/tai-khoan`
    const response = NextResponse.redirect(destination)

    await setSessionCookies(response.cookies, {
      id: outcome.student.id,
      status: outcome.student.status,
    })

    cleanupOAuthCookies(response)
    return response
  } catch (err) {
    console.error('Lỗi trong luồng Google OAuth Callback:', err)
    const response = NextResponse.redirect(`${fallbackUrl}?error=google_auth_failed`)
    cleanupOAuthCookies(response)
    return response
  }
}

function cleanupOAuthCookies(response: NextResponse) {
  response.cookies.delete('oauth_state')
  response.cookies.delete('oauth_callback_url')
  response.cookies.delete('oauth_entry_path')
}
