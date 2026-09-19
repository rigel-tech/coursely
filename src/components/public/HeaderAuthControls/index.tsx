'use client'

import Link from 'next/link'
import * as React from 'react'
import { useEffect, useState } from 'react'

import { Avatar } from '@/components/public/ui/avatar'
import { Button } from '@/components/public/ui/button'
import { NotificationBell } from '@/components/public/NotificationBell'
import { ThemeToggle } from '@/components/public/ThemeToggle'

/**
 * Picks the header's auth controls: Profile pill and notification bell when authenticated,
 * a sign-in link (to `/dang-nhap`) + a sign-up link (to `/dang-ky`) otherwise, plus Hotline
 * and ThemeToggle.
 */
export const HeaderAuthControls: React.FC = () => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [user, setUser] = useState<{ name?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/next/auth-status')
      .then((res) => res.json())
      .then((data: { authenticated?: unknown; user?: { name?: string } }) => {
        if (!cancelled) {
          setAuthenticated(data?.authenticated === true)
          if (data?.user) setUser(data.user)
        }
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      {/* Theme Toggle Button */}
      <ThemeToggle />

      {/* Hotline block */}
      <div className="hidden lg:flex flex-col items-end text-right leading-none select-none pr-1">
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          HOTLINE
        </span>
        <span className="text-sm font-bold text-primary dark:text-heading-accent mt-0.5">
          1900 6789
        </span>
      </div>

      {authenticated === true ? (
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <NotificationBell />

          {/* User profile pill */}
          <Link
            href="/tai-khoan"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 hover:bg-muted p-1 sm:pr-3.5 transition-colors"
          >
            <Avatar name={user?.name || 'Tài khoản'} size="sm" className="size-7 text-xs" />
            <span className="hidden sm:inline-block text-sm font-medium text-foreground max-w-[120px] truncate">
              {user?.name || 'Tài khoản'}
            </span>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="px-2 sm:px-3 text-xs sm:text-sm h-8 sm:h-9"
          >
            <Link href="/dang-nhap">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm" className="px-2.5 sm:px-3 text-xs sm:text-sm h-8 sm:h-9">
            <Link href="/dang-ky">Đăng ký</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
