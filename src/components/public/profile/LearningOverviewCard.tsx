import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/public/ui/card'
import type { StudentEnrollmentItem } from '@/services/student-enrollment'

interface LearningOverviewCardProps {
  enrollments: StudentEnrollmentItem[]
}

export function LearningOverviewCard({ enrollments }: LearningOverviewCardProps) {
  const { completedCount, inProgressCount, pendingCount } = useMemo(() => {
    let completed = 0
    let inProgress = 0
    let pending = 0

    for (const enrollment of enrollments) {
      if (enrollment.enrollmentStatus === 'COMPLETED') completed++
      else if (
        enrollment.enrollmentStatus === 'ATTENDED' ||
        enrollment.enrollmentStatus === 'CONFIRMED'
      )
        inProgress++
      else if (enrollment.enrollmentStatus === 'NEW') pending++
    }

    return { completedCount: completed, inProgressCount: inProgress, pendingCount: pending }
  }, [enrollments])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-accent text-xl font-bold">Tổng quan học tập</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="flex items-center justify-between">
          <span className="text-muted-foreground">Khóa đã hoàn thành</span>
          <span className="font-semibold text-foreground">{completedCount}</span>
        </p>
        <p className="flex items-center justify-between">
          <span className="text-muted-foreground">Đang học</span>
          <span className="font-semibold text-foreground">{inProgressCount}</span>
        </p>
        <p className="flex items-center justify-between">
          <span className="text-muted-foreground">Chờ xác nhận</span>
          <span className="font-semibold text-foreground">{pendingCount}</span>
        </p>
      </CardContent>
    </Card>
  )
}
