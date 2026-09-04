'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'

import { LoginCta } from '@/components/public/LoginCta'
import { RegisterCta } from '@/components/public/RegisterCta'
import { LogoutCta } from '@/components/public/LogoutCta'

/**
 * Picks the header's auth controls: `LogoutCta` when the visitor has an active
 * public-site session, `LoginCta` + `RegisterCta` otherwise.
 *
 * The decision cannot be made in a Server Component here: `src/app/(frontend)/page.tsx`,
 * `courses/`, and `posts/` are `force-static`, which makes `headers()` / `cookies()`
 * return empty — the proxy-forwarded `x-user-id` would always read as signed-out on
 * exactly the pages that host the header. So the check runs client-side against
 * `GET /next/auth-status` after hydration. Server render and first client render both
 * take the signed-out branch, so hydration matches; the swap to `LogoutCta` happens in
 * the effect. See `specs/002-header-logout-ui/research.md` D1/D4.
 */
export const HeaderAuthControls: React.FC = () => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/next/auth-status')
      .then((res) => res.json())
      .then((data: { authenticated?: unknown }) => {
        if (!cancelled) setAuthenticated(data?.authenticated === true)
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (authenticated === true) return <LogoutCta />

  return (
    <>
      <LoginCta />
      <RegisterCta />
    </>
  )
}
