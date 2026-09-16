'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  createEnrollmentAction,
  type CreateEnrollmentState,
} from '@/actions/student/create-enrollment'
import { Button } from '@/components/public/ui/button'
import { FormField } from '@/components/public/forms/field'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import {
  createEnrollmentSchema,
  type CreateEnrollmentInput,
} from '@/lib/validation/create-enrollment-schema'
import type { Course, Student } from '@/payload-types'

export type CourseRegistrationCourse = Pick<Course, 'id' | 'title'>

export function CourseRegistrationForm({
  course,
  profile,
  onSuccess,
}: {
  course: CourseRegistrationCourse
  profile?: Partial<Pick<Student, 'email' | 'fullName' | 'phone'>>
  onSuccess?: () => void
}) {
  const { email, fullName, phone } = profile ?? {}
  const [message, setMessage] = useState<CreateEnrollmentState | null>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<Required<CreateEnrollmentInput>>({
    resolver: profile ? zodResolver(createEnrollmentSchema) : undefined,
    defaultValues: { courseId: course.id, fullName: fullName ?? '', phone: phone ?? '' },
  })

  const onSubmit = async (values: Required<CreateEnrollmentInput>) => {
    const result = await createEnrollmentAction(values).catch((): CreateEnrollmentState => ({
      status: 'error',
      message: 'Không thể đăng ký khóa học. Vui lòng thử lại.',
    }))

    setMessage(result)

    if (result.status === 'success') {
      onSuccess?.()
      return
    }

    if (result.redirectTo) {
      window.location.assign(result.redirectTo)
    }
  }

  return (
    <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      {email ? (
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <p className="text-muted-foreground text-sm">{email}</p>
        </div>
      ) : null}

      <FormField error={errors.fullName?.message} htmlFor="registration-fullName" label="Họ và tên">
        <Input
          id="registration-fullName"
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={errors.fullName ? 'registration-fullName-error' : undefined}
          {...register('fullName')}
        />
      </FormField>

      <FormField error={errors.phone?.message} htmlFor="registration-phone" label="Số điện thoại">
        <Input
          id="registration-phone"
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? 'registration-phone-error' : undefined}
          {...register('phone')}
        />
      </FormField>

      {message ? (
        <p
          aria-live="polite"
          className="rounded-md border border-border bg-muted px-3 py-2 text-sm"
          role="status"
        >
          {message.message}
        </p>
      ) : null}

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang gửi...' : 'Gửi đăng ký'}
      </Button>
    </form>
  )
}
