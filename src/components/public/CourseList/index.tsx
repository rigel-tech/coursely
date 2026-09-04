import { BookOpenIcon } from 'lucide-react'
import * as React from 'react'

import { CourseCard, type CourseSummary } from '@/components/public/CourseCard'
import { EmptyState } from '@/components/public/ui/empty-state'
import { cn } from '@/utilities/ui'

export type CourseListProps = {
  courses: CourseSummary[]
  /** Optional heading above the grid. */
  title?: string
  /** Shown in place of the grid when `courses` is empty. */
  emptyTitle?: string
  emptyDescription?: string
  /** Action offered on the empty state, e.g. a link clearing the filters. */
  emptyAction?: React.ReactNode
  className?: string
}

/**
 * Responsive grid of CourseCard, with an empty state built in.
 */
export function CourseList({
  className,
  courses,
  emptyAction,
  emptyDescription = 'Không tìm thấy khóa học nào phù hợp với bộ lọc hiện tại.',
  emptyTitle = 'Không có khóa học nào',
  title,
}: CourseListProps) {
  return (
    <section className={cn('flex flex-col gap-6', className)}>
      {title ? <h2 className="text-heading-accent text-xl font-semibold">{title}</h2> : null}

      {courses.length === 0 ? (
        <EmptyState
          action={emptyAction}
          description={emptyDescription}
          icon={BookOpenIcon}
          title={emptyTitle}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard course={course} key={course.id} />
          ))}
        </div>
      )}
    </section>
  )
}
