import Link from 'next/link'
import { Badge } from '@/components/public/ui/badge'
import { ENROLLMENT_STATUS } from '@/components/public/enrollment-status'
import { PAYMENT_STATUS_LABELS } from '@/components/public/payment-status'
import { formatDate } from '@/utilities/formatDateTime'
import { AssignedClassDetails } from './AssignedClassDetails'
import type { StudentEnrollmentItem } from '@/services/student-enrollment'


interface EnrollmentCardProps {
  enrollment: StudentEnrollmentItem
}

export function EnrollmentCard({ enrollment }: EnrollmentCardProps) {
  const course = enrollment.course
  const enrollmentStatusInfo = ENROLLMENT_STATUS[enrollment.enrollmentStatus]
  const paymentStatusInfo = PAYMENT_STATUS_LABELS[enrollment.paymentStatus]
  const formattedDate = formatDate(enrollment.registeredAt || enrollment.createdAt)

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <Link
            href={`/khoa-hoc/${course.slug}`}
            className="text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
          >
            {course.title}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Ngày đăng ký: <strong className="text-foreground font-medium">{formattedDate}</strong>
            </span>
            {course.duration && (
              <span>
                Thời lượng:{' '}
                <strong className="text-foreground font-medium">{course.duration}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:self-center">
          <Badge variant={enrollmentStatusInfo.variant}>{enrollmentStatusInfo.label}</Badge>
          <Badge variant={paymentStatusInfo.variant}>{paymentStatusInfo.label}</Badge>
        </div>
      </div>

      <AssignedClassDetails
        assignedClass={enrollment.class}
        enrollmentStatus={enrollment.enrollmentStatus}
      />
    </div>
  )
}
