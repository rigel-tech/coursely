'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/components/public/forms/field'
import { email, required } from '@/components/public/forms/validation'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { cn } from '@/utilities/ui'

export type LoginValues = {
  email: string
  password: string
}

export type LoginFormProps = {
  /** Resolve to sign in, reject to surface the message on the form. */
  onSubmit: (values: LoginValues) => Promise<void> | void
  /** Server-side failure — wrong credentials, locked account. Cleared on the next submit. */
  error?: string
  /** Rendered under the button: a "forgot password" or "register" link. */
  footer?: React.ReactNode
  className?: string
}

/**
 * Email and password sign-in.
 *
 * Validation is client-side shape-checking only — it never decides whether an account
 * exists. Reject the `onSubmit` promise, or pass `error`, to show a server message; the
 * form keeps the entered email so the reader does not retype it.
 *
 * @example
 * ```tsx
 * <LoginForm
 *   error={signInError}
 *   onSubmit={async (values) => {
 *     const res = await signIn(values)
 *     if (!res.ok) throw new Error('Email hoặc mật khẩu không đúng')
 *   }}
 *   footer={<Link href="/quen-mat-khau">Quên mật khẩu?</Link>}
 * />
 * ```
 */
export function LoginForm({ className, error, footer, onSubmit }: LoginFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginValues>()

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (cause) {
      setError('root', {
        message: cause instanceof Error ? cause.message : 'Đăng nhập không thành công',
      })
    }
  })

  const rootError = error ?? errors.root?.message

  return (
    <form className={cn('flex flex-col gap-4', className)} noValidate onSubmit={submit}>
      {rootError ? (
        <p
          className="border-error-foreground bg-error text-error-foreground rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {rootError}
        </p>
      ) : null}

      <FormField error={errors.email?.message} htmlFor="login-email" label="Email">
        <Input
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="login-email"
          type="email"
          {...register('email', email())}
        />
      </FormField>

      <FormField error={errors.password?.message} htmlFor="login-password" label="Mật khẩu">
        <Input
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          aria-invalid={Boolean(errors.password)}
          autoComplete="current-password"
          id="login-password"
          type="password"
          {...register('password', required('Mật khẩu'))}
        />
      </FormField>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>

      {footer ? <div className="text-muted-foreground text-sm">{footer}</div> : null}
    </form>
  )
}
