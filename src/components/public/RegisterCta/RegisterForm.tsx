'use client'

import * as React from 'react'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Alert, AlertDescription } from '@/components/public/ui/alert'
import { Checkbox } from '@/components/public/ui/checkbox'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { registerAction } from '@/actions/auth/register'
import { initialRegisterState } from '@/lib/constants/register-state'
import { SubmitButton } from './SubmitButton'

/**
 * Self-registration form (Student). Fields follow the spec: email, password,
 * confirmPassword, optional fullName and phone, and a terms checkbox. Wired to
 * `registerAction` through `useActionState`. The redirect to `/xac-thuc-otp` runs
 * here, in an effect after the action resolves — not inside the action — so the
 * `pending_email` cookie from the action response is already stored before the
 * target page reads it.
 */
export const RegisterForm: React.FC = () => {
  const router = useRouter()
  const [state, formAction] = useActionState(registerAction, initialRegisterState)

  useEffect(() => {
    if (state.status === 'success') router.push('/xac-thuc-otp')
  }, [state.status, router])

  const hasFieldErrors = Boolean(state.fieldErrors && Object.keys(state.fieldErrors).length > 0)

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? 'register-email-error' : undefined}
        />
        {state.fieldErrors?.email && (
          <p
            id="register-email-error"
            role="alert"
            className="text-destructive-foreground font-medium text-xs"
          >
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password">Mật khẩu</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={state.fieldErrors?.password ? 'register-password-error' : undefined}
        />
        {state.fieldErrors?.password && (
          <p
            id="register-password-error"
            role="alert"
            className="text-destructive-foreground font-medium text-xs"
          >
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-confirm-password">Xác nhận mật khẩu</Label>
        <Input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.confirmPassword ? true : undefined}
          aria-describedby={
            state.fieldErrors?.confirmPassword ? 'register-confirm-password-error' : undefined
          }
        />
        {state.fieldErrors?.confirmPassword && (
          <p
            id="register-confirm-password-error"
            role="alert"
            className="text-destructive-foreground font-medium text-xs"
          >
            {state.fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-full-name">Họ và tên</Label>
        <Input id="register-full-name" name="fullName" type="text" autoComplete="name" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-phone">Số điện thoại</Label>
        <Input id="register-phone" name="phone" type="tel" autoComplete="tel" />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="register-terms"
            name="terms"
            value="on"
            aria-invalid={state.fieldErrors?.terms ? true : undefined}
            aria-describedby={state.fieldErrors?.terms ? 'register-terms-error' : undefined}
          />
          <Label htmlFor="register-terms" className="cursor-pointer">
            Tôi đồng ý với điều khoản sử dụng
          </Label>
        </div>
        {state.fieldErrors?.terms && (
          <p
            id="register-terms-error"
            role="alert"
            className="text-destructive-foreground font-medium text-xs"
          >
            {state.fieldErrors.terms}
          </p>
        )}
      </div>

      {state.status === 'error' && state.message && !hasFieldErrors && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <SubmitButton />
    </form>
  )
}
