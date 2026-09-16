'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  createEnrollmentAction,
  type CreateEnrollmentState,
} from '@/actions/student/create-enrollment'
import { Button } from '@/components/public/ui/button'
import { COURSE_TYPE_LABEL } from '@/components/public/course-type-label'
import { FormField } from '@/components/public/forms/field'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { Modal } from '@/components/public/ui/modal'
import {
  enrollmentProfileSchema,
  type EnrollmentProfileValues,
} from '@/lib/validation/enrollment-profile-schema'
import type { Course, Student } from '@/payload-types'

/** Shared by `CourseRegistrationForm` and `CourseRegistrationCTA` — passed through unchanged. */
export type CourseRegistrationCourse = Pick<Course, 'id' | 'title'> &
  Partial<Pick<Course, 'duration' | 'courseType' | 'registrationEndAt'>>

type CourseRegistrationFormProps = {
  course: CourseRegistrationCourse
  /** The signed-in student's own profile — email is shown, never edited (specs/009, Q1). */
  profile?: Partial<Pick<Student, 'email' | 'fullName' | 'phone'>>
  /** Fires once, after the server confirms the enrollment was created. */
  onSuccess?: () => void
}

export function CourseRegistrationForm({
  course,
  profile,
  onSuccess,
}: CourseRegistrationFormProps) {
  const {
    id: courseId,
    title: courseTitle,
    duration: courseDuration,
    courseType,
    registrationEndAt,
  } = course
  const { email, fullName, phone } = profile ?? {}
  const [message, setMessage] = useState<CreateEnrollmentState | null>(null)
  const [pendingValues, setPendingValues] = useState<EnrollmentProfileValues | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  // Reviewing, not editing: a field that is already complete shows as plain text, like
  // email — only a missing or invalidly-formatted one becomes an input, immediately, with
  // no separate "Chỉnh sửa" step (unlike /tai-khoan's ProfileForm). A validly-formatted but
  // factually wrong value is not reachable from here; that stays /tai-khoan's job.
  const hasFullName = Boolean(fullName?.trim())
  const hasValidPhone = Boolean(
    phone && enrollmentProfileSchema.shape.phone.safeParse(phone).success,
  )

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<EnrollmentProfileValues>({
    // No `profile` means a signed-out visitor: there is no profile of theirs to validate
    // yet, and the submission must still reach the server's sign-in redirect rather than
    // get stuck on required-field errors for fields the visitor was never shown as theirs
    // to fill in (research.md Decision 5).
    resolver: profile ? zodResolver(enrollmentProfileSchema) : undefined,
    defaultValues: { fullName: fullName ?? '', phone: phone ?? '' },
  })

  const submitEnrollment = async (values: EnrollmentProfileValues) => {
    const result = await createEnrollmentAction({
      courseId,
      fullName: values.fullName,
      phone: values.phone,
    }).catch((): CreateEnrollmentState => ({
      status: 'error',
      message: 'Không thể đăng ký khóa học. Vui lòng thử lại.',
    }))

    setMessage(result)

    if (result.status === 'success') {
      onSuccess?.()
      return
    }

    // A redirectTo means the server refused for a reason only signing in can fix — follow
    // it with a full navigation so the fresh session cookie is read there.
    if (result.redirectTo) {
      window.location.assign(result.redirectTo)
    }
  }

  const handleConfirm = async () => {
    if (!pendingValues) return
    setIsConfirming(true)
    try {
      await submitEnrollment(pendingValues)
    } finally {
      setIsConfirming(false)
      setPendingValues(null)
    }
  }

  return (
    <>
      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={handleSubmit(setPendingValues)}
      >
        {email ? (
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <p className="text-muted-foreground text-sm">{email}</p>
          </div>
        ) : null}

        <FormField
          error={hasFullName ? undefined : errors.fullName?.message}
          htmlFor="registration-fullName"
          label="Họ và tên"
        >
          {hasFullName ? (
            // `shouldUnregister` defaults to `false`, so `register('fullName')`'s
            // `defaultValues` entry still reaches `handleSubmit` without a control on the
            // page for it — no hidden input needed to carry it through.
            <p className="text-muted-foreground text-sm">{fullName}</p>
          ) : (
            <Input
              id="registration-fullName"
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby={errors.fullName ? 'registration-fullName-error' : undefined}
              {...register('fullName')}
            />
          )}
        </FormField>

        <FormField
          error={hasValidPhone ? undefined : errors.phone?.message}
          htmlFor="registration-phone"
          label="Số điện thoại"
        >
          {hasValidPhone ? (
            <p className="text-muted-foreground text-sm">{phone}</p>
          ) : (
            <Input
              id="registration-phone"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? 'registration-phone-error' : undefined}
              {...register('phone')}
            />
          )}
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

      <Modal
        description={`Bạn có chắc chắn muốn đăng ký khóa học "${courseTitle}"?`}
        footer={
          <>
            <Button
              disabled={isConfirming}
              onClick={() => setPendingValues(null)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <Button disabled={isConfirming} onClick={handleConfirm} type="button">
              {isConfirming ? 'Đang gửi...' : 'Xác nhận đăng ký'}
            </Button>
          </>
        }
        onOpenChange={(open) => {
          if (!open) setPendingValues(null)
        }}
        open={pendingValues !== null}
        title="Xác nhận đăng ký khóa học"
      >
        <dl className="flex flex-col gap-2 text-sm">
          {courseDuration ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Thời lượng</dt>
              <dd className="font-medium">{courseDuration}</dd>
            </div>
          ) : null}
          {courseType ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Hình thức</dt>
              <dd className="font-medium">{COURSE_TYPE_LABEL[courseType]}</dd>
            </div>
          ) : null}
          {registrationEndAt ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Hạn chót đăng ký</dt>
              <dd className="font-medium">
                {new Date(registrationEndAt).toLocaleDateString('vi-VN')}
              </dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-border pt-2">
            <dt className="text-muted-foreground">Họ và tên</dt>
            <dd className="font-medium">{pendingValues?.fullName}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Số điện thoại</dt>
            <dd className="font-medium">{pendingValues?.phone}</dd>
          </div>
          {email ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{email}</dd>
            </div>
          ) : null}
        </dl>
      </Modal>
    </>
  )
}
