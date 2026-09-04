'use client'

import { LogOut } from 'lucide-react'
import * as React from 'react'
import { useState } from 'react'

import { Button } from '@/components/public/ui/button'
import { logoutAction } from '@/actions/auth/logout'

export interface LogoutCtaProps {
  className?: string
  variant?: 'ghost' | 'outline' | 'destructive' | 'default'
  size?: 'default' | 'sm' | 'lg'
  showIcon?: boolean
}

/**
 * "Đăng xuất" control — callable from profile settings or header.
 * Calls `logoutAction` (this device) and follows its `redirectTo` with a full-document navigation.
 */
export const LogoutCta: React.FC<LogoutCtaProps> = ({
  className,
  variant = 'ghost',
  size = 'sm',
  showIcon = false,
}) => {
  const [pending, setPending] = useState(false)

  const onClick = async () => {
    if (pending) return
    setPending(true)
    try {
      const { redirectTo } = await logoutAction()
      window.location.assign(redirectTo)
    } catch {
      setPending(false)
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={pending}
      aria-busy={pending}
      onClick={onClick}
      className={className}
    >
      {showIcon && <LogOut className="mr-2 size-4" />}
      {pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
    </Button>
  )
}
