'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import * as React from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/public/ui/button'
import { LoginCta } from '@/components/public/LoginCta'
import { RegisterCta } from '@/components/public/RegisterCta'

/**
 * Picks the header's auth controls: Profile link when the visitor has an active
 * public-site session, `LoginCta` + `RegisterCta` (đăng nhập + đăng ký) otherwise.
 * Logout control is located inside the profile page.
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
          <Link href="/tai-khoan" className="flex items-center gap-1.5">
            <User className="size-4" />
            <span>Tài khoản</span>
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <LoginCta />
      <RegisterCta />
    </div>
  )
}
