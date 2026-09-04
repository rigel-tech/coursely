'use client'

import * as React from 'react'
import { useState } from 'react'

import { Button } from '@/components/public/ui/button'
import { logoutAction } from '@/actions/auth/logout'

/**
 * "Đăng xuất" control for the public header — sibling to `LoginCta` / `RegisterCta`,
 * shown by `HeaderAuthControls` once the session check confirms a signed-in visitor.
 *
 * Calls the existing `logoutAction` (this device) and follows its `redirectTo` with a
 * full-document navigation, mirroring `LoginForm`: the destination must re-read session
 * state server-side and `/admin` is a separate route tree, so `router.push` will not do.
 *
 * A plain `pending` flag rather than `useTransition`: on success the button stays
 * disabled through the navigation away; on failure — `logoutAction` clears the session
 * cookies before it could throw, so a rejection only means "no destination reported" —
 * it is reset so the visitor can retry instead of being trapped on a dead control.
 */
export const LogoutCta: React.FC = () => {
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
      size="sm"
      variant="ghost"
      disabled={pending}
      aria-busy={pending}
      onClick={onClick}
    >
      {pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
    </Button>
  )
}
