'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { FormField } from '@/components/public/forms/field'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { registerSchema, type RegisterValues } from '@/lib/validation/register-schema'
import { cn } from '@/utilities/ui'

export type RegisterFormProps = {
  /** Resolve to create the account, reject to surface the message on the form. */
  onSubmit: (values: RegisterValues) => Promise<void> | void
  /** Server-side failure — an address already registered, for instance. */
  error?: string
  className?: string
}

/**
 * Account creation: name, email, and a password with confirmation.
 *
 * Validated by `registerSchema` through `zodResolver` — the same schema
 * `registerAction` re-checks server-side (see `lib/validation/register-schema.ts`), so a
 * value this form accepts is never one the server then rejects.
 *
 * `onSubmit` receives one object holding every field — `registerAction` takes exactly that
 * shape, so nothing between the two reshapes it. A phone number is deliberately absent:
 * registration asks for the least that can create an account, and `/tai-khoan` collects the
 * rest once there is one.
 *
 * @example
 * ```tsx
 * <RegisterForm
 *   onSubmit={async (values) => {
 *     const res = await createAccount(values)
 *     if (!res.ok) throw new Error('Email này đã được đăng ký')
 *   }}
 * />
 * ```
 */
export function RegisterForm({ className, error, onSubmit }: RegisterFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

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
          {...register('fullName')}
        />
      </FormField>

      <FormField error={errors.email?.message} htmlFor="register-email" label="Email">
        <Input
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="register-email"
          type="email"
          {...register('email')}
        />
      </FormField>

      <FormField
        error={errors.password?.message}
        hint="Ít nhất 8 ký tự, gồm cả chữ và số"
        htmlFor="register-password"
        label="Mật khẩu"
      >
        <Input
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          id="register-password"
          type="password"
          {...register('password')}
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
          {...register('confirmPassword')}
        />
      </FormField>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
      </Button>
    </form>
  )
}
