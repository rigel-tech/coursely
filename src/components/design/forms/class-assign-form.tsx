'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/components/public/forms/field'
import { required } from '@/components/public/forms/validation'
import { Button } from '@/components/public/ui/button'
import { Checkbox } from '@/components/public/ui/checkbox'
import { Label } from '@/components/public/ui/label'
import { cn } from '@/utilities/ui'

/** A pickable option. `id` is what comes back in the submitted values. */
export type AssignOption = {
  id: string
  label: string
  /** Secondary line, e.g. a teacher's specialities or a learner's email. */
  hint?: string
}

export type ClassAssignValues = {
  teacherId: string
  studentIds: string[]
}

export type ClassAssignFormProps = {
  teachers: AssignOption[]
  students: AssignOption[]
  defaultValues?: Partial<ClassAssignValues>
  onSubmit: (values: ClassAssignValues) => Promise<void> | void
  className?: string
}

/**
 * Assign one teacher and any number of learners to a class.
 *
 * Learners are checkboxes rather than a multi-select: the list is browsed and compared, not
 * searched by name, and a multi-select hides what is already chosen behind a collapsed
 * control. Submitting with no learner selected is allowed — an empty class waiting for
 * enrolments is a real state.
 *
 * @example
 * ```tsx
 * <ClassAssignForm
 *   teachers={teachers.map((t) => ({ id: String(t.id), label: t.name, hint: t.headline }))}
 *   students={students.map((s) => ({ id: String(s.id), label: s.name, hint: s.email }))}
 *   defaultValues={{ teacherId: String(klass.teacher), studentIds: klass.students.map(String) }}
 *   onSubmit={(values) => saveClassRoster(klass.id, values)}
 * />
 * ```
 */
export function ClassAssignForm({
  className,
  defaultValues,
  onSubmit,
  students,
  teachers,
}: ClassAssignFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ClassAssignValues>({
    defaultValues: { studentIds: [], ...defaultValues },
  })

  return (
    <form
      className={cn('flex flex-col gap-4.5', className)}
      noValidate
      onSubmit={handleSubmit(async (values) => onSubmit(values))}
    >
      <FormField error={errors.teacherId?.message} htmlFor="assign-teacher" label="Giáo viên">
        <select
          aria-invalid={Boolean(errors.teacherId)}
          className="border-input bg-transparent text-foreground focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-4 focus-visible:outline-1"
          id="assign-teacher"
          {...register('teacherId', required('Giáo viên'))}
        >
          <option value="">— Chọn giáo viên —</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.hint ? `${teacher.label} — ${teacher.hint}` : teacher.label}
            </option>
          ))}
        </select>
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-foreground mb-1.5 text-sm font-medium">Học viên</legend>
        <div className="border-border divide-border max-h-72 divide-y overflow-y-auto rounded-md border">
          {students.map((student) => (
            <div className="flex items-start gap-2 p-3" key={student.id}>
              <Checkbox
                id={`assign-student-${student.id}`}
                value={student.id}
                {...register('studentIds')}
              />
              <Label className="font-normal" htmlFor={`assign-student-${student.id}`}>
                <span className="text-foreground">{student.label}</span>
                {student.hint ? (
                  <span className="text-muted-foreground-subtle block text-xs">{student.hint}</span>
                ) : null}
              </Label>
            </div>
          ))}
        </div>
      </fieldset>

      <Button className="self-end" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang lưu…' : 'Lưu phân công'}
      </Button>
    </form>
  )
}
