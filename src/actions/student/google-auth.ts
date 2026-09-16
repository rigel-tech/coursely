'use server'

import { randomBytes } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { buildGoogleAuthUrl } from '@/lib/auth/google-oauth'

export async function startGoogleAuthAction(callbackUrlInput?: string | null): Promise<void> {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const origin = (await headers()).get('origin')

  const referer = headerStore.get('referer') || ''
  const entryPath = referer.includes('/dang-ky') ? '/dang-ky' : '/dang-nhap'

  const callbackUrl = callbackUrlInput || '/'

  const state = randomBytes(16).toString('hex')
  const redirectUri = `${origin}/api/auth/google`

  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === 'production',
  })

  cookieStore.set('oauth_callback_url', callbackUrl, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === 'production',
  })

  cookieStore.set('oauth_entry_path', entryPath, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === 'production',
  })

  const googleAuthUrl = buildGoogleAuthUrl(state, redirectUri)
  redirect(googleAuthUrl)
}
