'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  createEnrollmentAction,
  type CreateEnrollmentState,
} from '@/actions/student/create-enrollment'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import {
  enrollmentProfileSchema,
  type EnrollmentProfileValues,
} from '@/lib/validation/enrollment-profile-schema'
import { VIETNAM_PHONE_REGEX } from '@/lib/validation/profile-schema'

type CourseRegistrationFormProps = {
  courseId: number
  courseTitle: string
  /** The signed-in student's own profile — email is shown, never edited (specs/009, Q1). */
  email?: string
  fullName?: string | null
  phone?: string | null
  /** Fires once, after the server confirms the enrollment was created. */
  onSuccess?: () => void
}

export function CourseRegistrationForm({
  courseId,
  email,
  fullName,
  phone,
  onSuccess,
}: CourseRegistrationFormProps) {
  const [message, setMessage] = useState<string | null>(null)

  // Reviewing, not editing: a field that is already complete shows as plain text, like
  // email — only a missing or invalidly-formatted one becomes an input, immediately, with
  // no separate "Chỉnh sửa" step (unlike /tai-khoan's ProfileForm). A validly-formatted but
  // factually wrong value is not reachable from here; that stays /tai-khoan's job.
  const hasFullName = Boolean(fullName?.trim())
  const hasValidPhone = Boolean(phone && VIETNAM_PHONE_REGEX.test(phone))

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<EnrollmentProfileValues>({
    resolver: zodResolver(enrollmentProfileSchema),
    defaultValues: { fullName: fullName ?? '', phone: phone ?? '' },
  })

  const onSubmit = async (values: EnrollmentProfileValues) => {
    const result: CreateEnrollmentState = await createEnrollmentAction({
      courseId,
      fullName: values.fullName,
      phone: values.phone,
    }).catch(() => ({
      status: 'error',
      message: 'Không thể đăng ký khóa học. Vui lòng thử lại.',
    }))

    setMessage(result.message)

    // A redirectTo means the server refused for a reason only signing in can fix — follow
    // it with a full navigation so the fresh session cookie is read there.
    if (result.redirectTo) {
      window.location.assign(result.redirectTo)
      return
    }

    if (result.status === 'success') onSuccess?.()
  }

  return (
    <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      {email ? (
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <p className="text-muted-foreground text-sm">{email}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={hasFullName ? undefined : 'registration-fullName'}>Họ và tên</Label>
        {hasFullName ? (
          <>
            <p className="text-muted-foreground text-sm">{fullName}</p>
            <input type="hidden" {...register('fullName')} />
          </>
        ) : (
          <>
            <Input
              id="registration-fullName"
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby={errors.fullName ? 'registration-fullName-error' : undefined}
              {...register('fullName')}
            />
            {errors.fullName ? (
              <p
                id="registration-fullName-error"
                role="alert"
                className="text-destructive-foreground text-xs font-medium"
              >
                {errors.fullName.message}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={hasValidPhone ? undefined : 'registration-phone'}>Số điện thoại</Label>
        {hasValidPhone ? (
          <>
            <p className="text-muted-foreground text-sm">{phone}</p>
            <input type="hidden" {...register('phone')} />
          </>
        ) : (
          <>
            <Input
              id="registration-phone"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'registration-phone-error' : undefined}
              {...register('phone')}
            />
            {errors.phone ? (
              <p
                id="registration-phone-error"
                role="alert"
                className="text-destructive-foreground text-xs font-medium"
              >
                {errors.phone.message}
              </p>
            ) : null}
          </>
        )}
      </div>

      {message ? (
        <p
          aria-live="polite"
          className="rounded-md border border-border bg-muted px-3 py-2 text-sm"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang gửi...' : 'Gửi đăng ký'}
      </Button>
    </form>
  )
}
