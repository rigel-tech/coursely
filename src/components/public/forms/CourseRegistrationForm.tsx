'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  createEnrollmentAction,
  type CreateEnrollmentState,
} from '@/actions/student/create-enrollment'
import { Button } from '@/components/public/ui/button'

export type CourseRegistrationValues = {
  courseId: number
}

type CourseRegistrationFormProps = {
  courseId: number
  courseTitle: string
  /** Fires once, after the server confirms the enrollment was created. */
  onSuccess?: () => void
}

export function CourseRegistrationForm({ courseId, onSuccess }: CourseRegistrationFormProps) {
  const [message, setMessage] = useState<string | null>(null)

  const {
    formState: { isSubmitting },
    handleSubmit,
    register,
  } = useForm<CourseRegistrationValues>({
    defaultValues: { courseId },
  })

  const onSubmit = async (values: CourseRegistrationValues) => {
    const result: CreateEnrollmentState = await createEnrollmentAction(values.courseId).catch(
      () => ({
        status: 'error',
        message: 'Không thể đăng ký khóa học. Vui lòng thử lại.',
      }),
    )

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
      <input type="hidden" {...register('courseId', { valueAsNumber: true })} />

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
