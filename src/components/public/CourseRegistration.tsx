'use client'

import { useEffect, useState, useTransition } from 'react'

import {
  CourseRegistrationForm,
  type CourseRegistrationCourse,
} from '@/components/public/forms/CourseRegistrationForm'
import { Badge } from '@/components/public/ui/badge'
import { Button } from '@/components/public/ui/button'
import { ENROLLMENT_STATUS } from '@/components/public/enrollment-status'
import { cancelEnrollmentAction } from '@/actions/student/cancel-enrollment'
import type { Enrollment, Student } from '@/payload-types'

type CourseProfile = Partial<Pick<Student, 'email' | 'fullName' | 'phone'>>

type CourseStatus = {
  authenticated?: boolean
  profile?: CourseProfile
  enrollment?: {
    id: number
    enrollmentStatus: Enrollment['enrollmentStatus']
    canCancel: boolean
  }
}

/**
 * Whether this visitor may enrol is decided by `createEnrollmentAction` when the form is
 * submitted, not here — this component renders the form and only reacts to what the server
 * answers. What it does decide is which of three things to show, and it asks
 * `/next/course-status` rather than being handed the answer as props: the page used to read
 * the session server-side to compute them, and that read is what kept it off the cache.
 *
 * Nothing renders until that answer arrives. Showing the form first would flash "Vui lòng
 * đăng nhập" at a student who is signed in, or invite a click on a form that is about to be
 * replaced by their own enrollment badge.
 *
 * A status route that cannot be reached resolves to signed-out, so the visitor is offered
 * sign-in — the one action that can help — rather than a spinner that never ends.
 */
export function CourseRegistration({ course }: { course: CourseRegistrationCourse }) {
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState<CourseProfile | undefined>(undefined)
  const [status, setStatus] = useState<Enrollment['enrollmentStatus'] | undefined>(undefined)
  const [cancellable, setCancellable] = useState(false)
  const [id, setId] = useState<number | undefined>(undefined)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    fetch(`/next/course-status?courseId=${course.id}`)
      .then((res) => res.json())
      .then((data: CourseStatus) => {
        if (cancelled) return

        if (data?.authenticated === true) setProfile(data.profile ?? {})
        if (data?.enrollment) {
          setStatus(data.enrollment.enrollmentStatus)
          setId(data.enrollment.id)
          setCancellable(data.enrollment.canCancel)
        }
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [course.id])

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
   * shown immediately without waiting for a reload to re-run the status lookup.
   */
  const handleRegistered = (newEnrollmentId: number) => {
    setStatus('NEW')
    setId(newEnrollmentId)
    setCancellable(true)
  }

  if (!loaded) {
    return (
      <div
        aria-label="Đang tải trạng thái đăng ký"
        className="flex flex-col gap-3 rounded-md border border-border bg-muted px-3 py-3"
        role="status"
      >
        <div className="h-5 w-2/3 animate-pulse rounded bg-border" />
        <div className="h-9 w-full animate-pulse rounded bg-border" />
      </div>
    )
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
