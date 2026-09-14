'use client'

import { useForm } from 'react-hook-form'

import { FormField } from '@/components/public/forms/field'
import { Button } from '@/components/public/ui/button'
import { Textarea } from '@/components/public/ui/textarea'

export type CourseRegistrationValues = {
  courseId: number
  note: string
}

type CourseRegistrationFormProps = {
  courseId: number
  courseTitle: string
  onSubmit: (values: CourseRegistrationValues) => void | Promise<void>
}

export function CourseRegistrationForm({
  courseId,
  courseTitle,
  onSubmit,
}: CourseRegistrationFormProps) {
  const {
    formState: { isSubmitting },
    handleSubmit,
    register,
  } = useForm<CourseRegistrationValues>({
    defaultValues: { courseId, note: '' },
  })

  return (
    <form className="mt-6 flex flex-col gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register('courseId', { valueAsNumber: true })} />
      <p className="text-muted-foreground text-sm">
        Bạn đang đăng ký khóa học <strong className="text-foreground">{courseTitle}</strong>.
      </p>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang gửi...' : 'Gửi đăng ký'}
      </Button>
    </form>
  )
}
