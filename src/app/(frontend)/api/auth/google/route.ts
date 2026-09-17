import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCodeForGoogleTokens, fetchGoogleUserInfo } from '@/lib/auth/google-oauth'
import { handleGoogleStudentAuth } from '@/services/student-google-auth'
import { setSessionCookies } from '@/lib/auth/session-cookies'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const origin = request.nextUrl.origin

  const entryPath = request.cookies.get('oauth_entry_path')?.value
  const fallbackUrl = `${origin}${entryPath}`

  if (error) {
    return sendPopupResponse(
      'ERROR',
      { error: 'google_auth_cancelled' },
      `${fallbackUrl}?error=google_auth_cancelled`,
    )
  }

  const storedState = request.cookies.get('oauth_state')?.value
  const callbackUrl = request.cookies.get('oauth_callback_url')?.value || '/'

  if (!code || !state || !storedState || state !== storedState) {
    return sendPopupResponse(
      'ERROR',
      { error: 'invalid_state' },
      `${fallbackUrl}?error=invalid_state`,
    )
  }

  try {
    const redirectUri = `${origin}/api/auth/google`

    const tokens = await exchangeCodeForGoogleTokens(code, redirectUri)
    const googleUser = await fetchGoogleUserInfo(tokens.access_token)
    const outcome = await handleGoogleStudentAuth(googleUser)

    if (outcome.kind === 'disabled') {
      return sendPopupResponse(
        'ERROR',
        { error: 'account_disabled' },
        `${fallbackUrl}?error=account_disabled`,
      )
    }

    const destination = callbackUrl.startsWith('/') ? callbackUrl : '/tai-khoan'
    const response = sendPopupResponse(
      'SUCCESS',
      { redirectTo: destination },
      `${origin}${destination}`,
    )

    await setSessionCookies(response.cookies, {
      id: outcome.student.id,
      status: outcome.student.status,
    })

    return response
  } catch (err) {
    return sendPopupResponse(
      'ERROR',
      { error: 'google_auth_failed' },
      `${fallbackUrl}?error=google_auth_failed`,
    )
  }
}

function cleanupOAuthCookies(response: NextResponse) {
  response.cookies.delete('oauth_state')
  response.cookies.delete('oauth_callback_url')
  response.cookies.delete('oauth_entry_path')
}

function sendPopupResponse(
  type: 'SUCCESS' | 'ERROR',
  data: Record<string, string>,
  fallbackUrl: string,
) {
  const serialized = JSON.stringify({ source: 'coursely_google_auth', type, ...data })
  const html = `<!DOCTYPE html>
<html>
  <head><title>Đang xử lý đăng nhập...</title></head>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage(${serialized}, window.location.origin);
        window.close();
      } else {
        window.location.href = ${JSON.stringify(fallbackUrl)};
      }
    </script>
    <p>Đang xử lý đăng nhập, vui lòng chờ...</p>
  </body>
</html>`

  const response = new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
  cleanupOAuthCookies(response)
  return response
}
