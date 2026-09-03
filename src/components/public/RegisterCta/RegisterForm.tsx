'use client'

import * as React from 'react'
import { useActionState } from 'react'

import { Checkbox } from '@/components/public/ui/checkbox'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { initialRegisterState, registerAction } from '@/actions/auth/register'
import { SubmitButton } from './SubmitButton'

/**
 * Self-registration form (Student). Fields follow the spec: email, password,
 * confirmPassword, optional fullName and phone, and a terms checkbox. Wired to
 * `registerAction` through `useActionState`; the action is a placeholder for now.
 */
export const RegisterForm: React.FC = () => {
  const [state, formAction] = useActionState(registerAction, initialRegisterState)

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
        />
        {state.fieldErrors?.email && (
          <p className="text-destructive text-sm">{state.fieldErrors.email}</p>
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
        />
        {state.fieldErrors?.password && (
          <p className="text-destructive text-sm">{state.fieldErrors.password}</p>
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
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-destructive text-sm">{state.fieldErrors.confirmPassword}</p>
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

      <div className="flex items-center gap-2">
        <Checkbox id="register-terms" name="terms" value="on" />
        <Label htmlFor="register-terms">Tôi đồng ý với điều khoản sử dụng</Label>
      </div>
      {state.fieldErrors?.terms && (
        <p className="text-destructive text-sm">{state.fieldErrors.terms}</p>
      )}

      {state.status === 'error' && state.message && (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
