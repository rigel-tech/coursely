'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/components/design/forms/field'
import {
  MIN_PASSWORD_LENGTH,
  email,
  matches,
  password,
  required,
} from '@/components/design/forms/validation'
import { Button } from '@/components/public/ui/button'
import { Checkbox } from '@/components/public/ui/checkbox'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { cn } from '@/utilities/ui'

export type RegisterValues = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  acceptedTerms: boolean
}

export type RegisterFormProps = {
  /** Resolve to create the account, reject to surface the message on the form. */
  onSubmit: (values: RegisterValues) => Promise<void> | void
  /** Server-side failure — an address already registered, for instance. */
  error?: string
  /** Label beside the terms checkbox. Pass a node so it can contain links. */
  termsLabel?: React.ReactNode
  className?: string
}

/**
 * Account creation: name, email, password with confirmation, and a terms checkbox.
 *
 * The confirmation is validated against the live value of the password field rather than a
 * snapshot, so correcting the first box re-checks the second. Terms consent is a required
 * field, not a pre-ticked box — a checked-by-default consent is not consent.
 *
 * @example
 * ```tsx
 * <RegisterForm
 *   onSubmit={async (values) => {
 *     const res = await createAccount(values)
 *     if (!res.ok) throw new Error('Email này đã được đăng ký')
 *   }}
 *   termsLabel={<>Tôi đồng ý với <Link href="/dieu-khoan">điều khoản sử dụng</Link></>}
 * />
 * ```
 */
export function RegisterForm({ className, error, onSubmit, termsLabel }: RegisterFormProps) {
  const {
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterValues>({ defaultValues: { acceptedTerms: false } })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (cause) {
      setError('root', {
        message: cause instanceof Error ? cause.message : 'Đăng ký không thành công',
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

      <FormField error={errors.fullName?.message} htmlFor="register-name" label="Họ và tên">
        <Input
          aria-invalid={Boolean(errors.fullName)}
          autoComplete="name"
          id="register-name"
          {...register('fullName', required('Họ và tên'))}
        />
      </FormField>

      <FormField error={errors.email?.message} htmlFor="register-email" label="Email">
        <Input
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="register-email"
          type="email"
          {...register('email', email())}
        />
      </FormField>

      <FormField
        error={errors.password?.message}
        hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}
        htmlFor="register-password"
        label="Mật khẩu"
      >
        <Input
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          id="register-password"
          type="password"
          {...register('password', password())}
        />
      </FormField>

      <FormField
        error={errors.confirmPassword?.message}
        htmlFor="register-confirm"
        label="Nhập lại mật khẩu"
      >
        <Input
          aria-invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
          id="register-confirm"
          type="password"
          {...register(
            'confirmPassword',
            matches(() => getValues('password'), 'Mật khẩu nhập lại không khớp'),
          )}
        />
      </FormField>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <Checkbox id="register-terms" {...register('acceptedTerms', { required: true })} />
          <Label className="text-muted-foreground text-sm font-normal" htmlFor="register-terms">
            {termsLabel ?? 'Tôi đồng ý với điều khoản sử dụng'}
          </Label>
        </div>
        {errors.acceptedTerms ? (
          <p className="text-error-foreground text-xs" role="alert">
            Bạn cần đồng ý với điều khoản để tiếp tục
          </p>
        ) : null}
      </div>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
      </Button>
    </form>
  )
}
