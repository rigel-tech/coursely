'use client'

import Link from 'next/link'
import * as React from 'react'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { loginAction } from '@/actions/auth/login'
import { initialLoginState } from '@/lib/constants/login-state'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
    </Button>
  )
}

/**
 * Sign-in form for the `/dang-nhap` page, wired to `loginAction` through
 * `useActionState`. Any `redirectTo` the action returns — a success target or the
 * AUTH_022 "verify first" bounce — is followed with a full-document navigation
 * from an effect, so the fresh `payload-token` / `pending_email` cookie reaches
 * the destination and `/admin` (a separate route tree) re-renders server-side.
 */
export const LoginForm: React.FC = () => {
  const [state, formAction] = useActionState(loginAction, initialLoginState)

  useEffect(() => {
    // Full-document load, not router.push: the destination must re-read the auth
    // cookie server-side, and `/admin` is outside this route tree.
    if (state.redirectTo) window.location.assign(state.redirectTo)
  }, [state.redirectTo])

  // `route-guard` bounces a blocked visitor to `/dang-nhap?callbackUrl=<path>`. Fold
  // it into the submission so a successful login returns there; the server
  // re-validates it with `safeCallbackUrl`, so a tampered value is harmless.
  const submit = (formData: FormData) => {
    const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl')
    if (callbackUrl) formData.set('callbackUrl', callbackUrl)
    formAction(formData)
  }

  return (
    <form action={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
        />
        {state.fieldErrors?.email && (
          <p className="text-destructive text-sm">{state.fieldErrors.email}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Mật khẩu</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
        />
        {state.fieldErrors?.password && (
          <p className="text-destructive text-sm">{state.fieldErrors.password}</p>
        )}
      </div>

      <div className="flex items-center justify-end">
        <Link href="/quen-mat-khau" className="text-xs text-link hover:underline font-medium">
          Quên mật khẩu?
        </Link>
      </div>

      {state.status === 'error' && state.message && (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
