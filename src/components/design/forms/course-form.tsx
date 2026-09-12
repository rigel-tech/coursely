'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'

import type { CourseLevel } from '@/components/design/blocks/course-card'
import { FormField } from '@/components/public/forms/field'
import { numberInRange, required } from '@/components/public/forms/validation'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { Textarea } from '@/components/public/ui/textarea'
import { cn } from '@/utilities/ui'

export type CourseValues = {
  title: string
  summary: string
  level: CourseLevel
  /** Whole weeks. */
  durationWeeks: number
  /** Minor units are the caller's business; this is the plain number the editor types. */
  price: number
}

export type CourseFormProps = {
  /** Pre-fills the form when editing. Omit to create. */
  defaultValues?: Partial<CourseValues>
  onSubmit: (values: CourseValues) => Promise<void> | void
  /** Rendered beside the submit button — usually a cancel link. */
  secondaryAction?: React.ReactNode
  className?: string
}

const LEVELS: { label: string; value: CourseLevel }[] = [
  { label: 'Cơ bản', value: 'beginner' },
  { label: 'Trung cấp', value: 'intermediate' },
  { label: 'Nâng cao', value: 'advanced' },
]

/**
 * Create or edit a course: title, summary, level, duration and price.
 *
 * Pass `defaultValues` to edit; the same component covers both, so the two paths cannot
 * drift apart. Level is a native `<select>` rather than the Radix one, because this form is
 * frequently rendered inside a dialog and a portalled listbox inside a portalled dialog is
 * a stacking problem with no upside here.
 *
 * @example
 * ```tsx
 * <CourseForm
 *   defaultValues={{ title: course.title, level: 'beginner', durationWeeks: 8 }}
 *   onSubmit={(values) => saveCourse(course.id, values)}
 *   secondaryAction={<Button variant="ghost" onClick={close}>Huỷ</Button>}
 * />
 * ```
 */
export function CourseForm({
  className,
  defaultValues,
  onSubmit,
  secondaryAction,
}: CourseFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CourseValues>({ defaultValues })

  return (
    <form
      className={cn('flex flex-col gap-4', className)}
      noValidate
      onSubmit={handleSubmit(async (values) => onSubmit(values))}
    >
      <FormField error={errors.title?.message} htmlFor="course-title" label="Tên khoá học">
        <Input
          aria-invalid={Boolean(errors.title)}
          id="course-title"
          {...register('title', required('Tên khoá học'))}
        />
      </FormField>

      <FormField
        error={errors.summary?.message}
        hint="Một hai câu hiển thị trên thẻ khoá học"
        htmlFor="course-summary"
        label="Mô tả ngắn"
      >
        <Textarea
          aria-invalid={Boolean(errors.summary)}
          id="course-summary"
          {...register('summary', required('Mô tả ngắn'))}
        />
      </FormField>

      <FormField error={errors.level?.message} htmlFor="course-level" label="Trình độ">
        <select
          aria-invalid={Boolean(errors.level)}
          className="border-input bg-transparent text-foreground focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-4 focus-visible:outline-1"
          id="course-level"
          {...register('level', required('Trình độ'))}
        >
          {LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          error={errors.durationWeeks?.message}
          htmlFor="course-duration"
          label="Thời lượng (tuần)"
        >
          <Input
            aria-invalid={Boolean(errors.durationWeeks)}
            id="course-duration"
            inputMode="numeric"
            type="number"
            {...register('durationWeeks', numberInRange('Thời lượng', 1, 104))}
          />
        </FormField>

        <FormField error={errors.price?.message} htmlFor="course-price" label="Học phí">
          <Input
            aria-invalid={Boolean(errors.price)}
            id="course-price"
            inputMode="numeric"
            type="number"
            {...register('price', numberInRange('Học phí', 0, 1_000_000_000))}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-end gap-2">
        {secondaryAction}
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Đang lưu…' : 'Lưu khoá học'}
        </Button>
      </div>
    </form>
  )
}
