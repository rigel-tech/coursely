'use client'

import Link from 'next/link'
import * as React from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/public/ui/button'
import { LoginCta } from '@/components/public/LoginCta'
import { RegisterCta } from '@/components/public/RegisterCta'
import { LogoutCta } from '@/components/public/LogoutCta'

/**
 * Picks the header's auth controls: `LogoutCta` + Profile link when the visitor has an active
 * public-site session, `LoginCta` + `RegisterCta` otherwise.
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

  if (authenticated === true) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href="/tai-khoan">Tài khoản</Link>
        </Button>
        <LogoutCta />
      </div>
    )
  }

  return (
    <>
      <LoginCta />
      <RegisterCta />
    </>
  )
}
