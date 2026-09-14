'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { createEnrollmentAction } from '@/actions/student/create-enrollment'
import { Button } from '@/components/public/ui/button'

export type CourseRegistrationValues = {
  courseId: number
  note: string
}

type CourseRegistrationFormProps = {
  courseId: number
  courseTitle: string
}

export function CourseRegistrationForm({ courseId, courseTitle }: CourseRegistrationFormProps) {
  const [message, setMessage] = useState<string | null>(null)
  const {
    formState: { isSubmitting },
    handleSubmit,
    register,
  } = useForm<CourseRegistrationValues>({
    defaultValues: { courseId, note: '' },
  })

  const onSubmit = async (values: CourseRegistrationValues) => {
    const result = await createEnrollmentAction(values.courseId).catch(() => ({
      status: 'error' as const,
      message: 'Không thể đăng ký khóa học. Vui lòng thử lại.',
    }))
    setMessage(result.message)
  }

  return (
    <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('courseId', { valueAsNumber: true })} />
      <p className="text-muted-foreground text-sm">
        Bạn đang đăng ký khóa học <strong className="text-foreground">{courseTitle}</strong>.
      </p>
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
