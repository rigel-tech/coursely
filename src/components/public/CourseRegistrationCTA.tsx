'use client'

import { useState } from 'react'

import { CourseRegistrationForm } from '@/components/public/forms/CourseRegistrationForm'
import { Badge } from '@/components/public/ui/badge'
import { ENROLLMENT_STATUS } from '@/components/public/enrollment-status'
import type { Enrollment } from '@/payload-types'

type CourseRegistrationCTAProps = {
  courseId: number
  courseTitle: string
  email?: string
  enrollmentStatus?: Enrollment['enrollmentStatus']
  fullName?: string | null
  phone?: string | null
}

/**
 * Whether this visitor may enrol is decided by `createEnrollmentAction` when the form is
 * submitted, not here — this component renders the form unconditionally and only reacts
 * to what the server answers. `enrollmentStatus` seeds the badge from the page's own
 * server-side lookup; `onSuccess` moves it into local state so a successful submit shows
 * the badge immediately, without a reload.
 */
export function CourseRegistrationCTA({
  courseId,
  courseTitle,
  email,
  enrollmentStatus,
  fullName,
  phone,
}: CourseRegistrationCTAProps) {
  const [status, setStatus] = useState(enrollmentStatus)

  return (
    <div>
      {status ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted px-3 py-3">
          <span className="text-muted-foreground text-sm">Trạng thái đăng ký</span>
          <Badge variant={ENROLLMENT_STATUS[status].variant}>
            {ENROLLMENT_STATUS[status].label}
          </Badge>
        </div>
      ) : (
        <CourseRegistrationForm
          courseId={courseId}
          courseTitle={courseTitle}
          profile={{ email, fullName, phone }}
          onSuccess={() => setStatus('NEW')}
        />
      )}
    </div>
  )
}
