'use client'

import { useState, useTransition } from 'react'

import {
  CourseRegistrationForm,
  type CourseRegistrationCourse,
} from '@/components/public/forms/CourseRegistrationForm'
import { Badge } from '@/components/public/ui/badge'
import { Button } from '@/components/public/ui/button'
import { ENROLLMENT_STATUS } from '@/components/public/enrollment-status'
import { cancelEnrollmentAction } from '@/actions/student/cancel-enrollment'
import type { Enrollment, Student } from '@/payload-types'

type CourseRegistrationProps = {
  course: CourseRegistrationCourse
  enrollmentId?: number
  enrollmentStatus?: Enrollment['enrollmentStatus']
  canCancel?: boolean
  profile?: Partial<Pick<Student, 'email' | 'fullName' | 'phone'>>
}

/**
 * Whether this visitor may enrol is decided by `createEnrollmentAction` when the form is
 * submitted, not here — this component renders the form unconditionally and only reacts
 * to what the server answers. `enrollmentStatus` seeds the badge from the page's own
 * server-side lookup; `onSuccess` moves it into local state so a successful submit shows
 * the badge immediately, without a reload. `canCancel` is the same page-level lookup's
 * verdict — only a display hint; `cancelEnrollmentAction` re-validates everything itself.
 */
export function CourseRegistration({
  course,
  enrollmentId,
  enrollmentStatus,
  canCancel = false,
  profile,
}: CourseRegistrationProps) {
  const [status, setStatus] = useState(enrollmentStatus)
  const [cancellable, setCancellable] = useState(canCancel)
  const [id, setId] = useState(enrollmentId)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCancel = () => {
    if (!id) return
    if (!window.confirm('Bạn có chắc muốn hủy đăng ký khóa học này?')) return

    startTransition(async () => {
      const result = await cancelEnrollmentAction(id)
      setMessage(result.message)
      if (result.status === 'success') {
        setStatus(undefined)
        setCancellable(false)
        setId(undefined)
      }
    })
  }

  /**
   * A registration `createEnrollmentAction` just accepted is always `NEW` + unpaid + no
   * class yet — `isEnrollmentCancellable`'s exact base case — so the cancel control can be
   * shown immediately without waiting for a reload to re-run the page-level lookup.
   */
  const handleRegistered = (newEnrollmentId: number) => {
    setStatus('NEW')
    setId(newEnrollmentId)
    setCancellable(true)
  }

  return (
    <div>
      {status ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-muted px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">Trạng thái đăng ký</span>
            <Badge variant={ENROLLMENT_STATUS[status].variant}>
              {ENROLLMENT_STATUS[status].label}
            </Badge>
          </div>
          {cancellable && id ? (
            <Button disabled={isPending} onClick={handleCancel} size="sm" variant="destructive">
              {isPending ? 'Đang hủy...' : 'Hủy đăng ký'}
            </Button>
          ) : null}
        </div>
      ) : (
        <CourseRegistrationForm course={course} profile={profile} onSuccess={handleRegistered} />
      )}
      {message ? (
        <p aria-live="polite" className="text-muted-foreground text-sm mt-3" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
