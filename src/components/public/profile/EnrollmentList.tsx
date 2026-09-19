'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, GraduationCap } from 'lucide-react'
import { Button } from '@/components/public/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/public/ui/card'
import { EmptyState } from '@/components/public/ui/empty-state'
import { EnrollmentCard } from './EnrollmentCard'
import type { StudentEnrollmentItem } from '@/services/student-enrollment'
import { isEnrollmentInProgress } from '@/components/public/enrollment-status'
const COURSE_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'in-progress', label: 'Đang học' },
  { key: 'completed', label: 'Hoàn thành' },
] as const

type CourseTab = (typeof COURSE_TABS)[number]['key']

interface EnrollmentListProps {
  enrollments: StudentEnrollmentItem[]
}

export function EnrollmentList({ enrollments }: EnrollmentListProps) {
  const [courseTab, setCourseTab] = useState<CourseTab>('all')

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      if (courseTab === 'in-progress') {
        return isEnrollmentInProgress(e.enrollmentStatus)
      }
      if (courseTab === 'completed') {
        return e.enrollmentStatus === 'COMPLETED'
      }
      return true
    })
  }, [enrollments, courseTab])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-heading-accent text-xl font-bold">Khóa học của tôi</CardTitle>
          <CardDescription>Danh sách khóa học bạn đã đăng ký tại Coursely.</CardDescription>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {COURSE_TABS.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              size="sm"
              variant={courseTab === tab.key ? 'default' : 'outline'}
              onClick={() => setCourseTab(tab.key)}
            >
              {tab.label}
              {tab.key === 'all' && enrollments.length > 0 ? ` (${enrollments.length})` : ''}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {filteredEnrollments.length === 0 ? (
          enrollments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Chưa có khóa học nào"
              description="Bạn chưa đăng ký khóa học nào tại Coursely. Khám phá các khóa học đang mở lớp để bắt đầu hành trình học tập."
              action={
                <Button asChild>
                  <Link href="/khoa-hoc">Khám phá khóa học</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={courseTab === 'completed' ? GraduationCap : BookOpen}
              title={
                courseTab === 'completed'
                  ? 'Chưa có khóa học hoàn thành'
                  : 'Không có khóa học đang học'
              }
              description={
                courseTab === 'completed'
                  ? 'Bạn chưa hoàn thành khóa học nào. Hãy tiếp tục theo dõi tiến trình học tập!'
                  : 'Hiện không có khóa học nào trong danh sách đang học.'
              }
              action={
                <Button variant="outline" onClick={() => setCourseTab('all')}>
                  Xem tất cả khóa học ({enrollments.length})
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-4">
            {filteredEnrollments.map((enrollment) => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
