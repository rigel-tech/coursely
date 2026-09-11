'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { FormField } from '@/components/public/forms/field'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { registerAction } from '@/actions/student/register'
import { initialRegisterState, type RegisterState } from '@/lib/constants/register-state'
import { registerSchema, type RegisterValues } from '@/lib/validation/register-schema'

const SYSTEM_FAILURE: RegisterState = {
  status: 'error',
  message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
}

/**
 * Self-registration form for the `/dang-ky` page. `react-hook-form` owns the fields and
 * every field-level message, validating against the same `registerSchema` the action
 * re-checks server-side, so a value this form accepts is never one the server then rejects.
 *
 * On success it navigates to `/xac-thuc-otp` with `router.push` — a client-side
 * navigation, not a full reload: unlike `LoginForm`, nothing server-rendered at the
 * destination needs to read a fresh cookie synchronously, `verifyOtpAction` reads it only
 * when the OTP is submitted, by which point the browser already holds it.
 *
 * The action rethrows anything it has no copy for, so the `.catch` here is the last place
 * a system failure can reach the person instead of crashing the page.
 */
export function RegisterForm() {
  const router = useRouter()
  const [state, setState] = useState<RegisterState>(initialRegisterState)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (values: RegisterValues) => {
    const result = await registerAction(values).catch(() => SYSTEM_FAILURE)

    setState(result)
    if (result.status === 'success') router.push('/xac-thuc-otp')
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      {state.status === 'error' && state.message ? (
        <p
          className="border-error-foreground bg-error text-error-foreground rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {state.message}
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
