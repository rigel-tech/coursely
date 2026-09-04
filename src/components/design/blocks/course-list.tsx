import { BookOpenIcon } from 'lucide-react'
import * as React from 'react'

import { CourseCard, type CourseSummary } from '@/components/design/blocks/course-card'
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
 * Responsive grid of {@link CourseCard}, with an empty state built in.
 *
 * Handling emptiness here rather than at every call site is the point: a filtered listing
 * that matches nothing must say so, and a bare `courses.map()` renders a blank region that
 * looks like a failed fetch.
 *
 * This component does not fetch, paginate or sort — give it the page of courses you want
 * shown, already ordered.
 *
 * @example
 * ```tsx
 * <CourseList
 *   title="Khoá học tiếng Anh giao tiếp"
 *   courses={courses.map(toCourseSummary)}
 *   emptyTitle="Không có khoá học nào khớp bộ lọc"
 *   emptyAction={<Button variant="outline" onClick={clearFilters}>Xoá bộ lọc</Button>}
 * />
 * ```
 */
export function CourseList({
  className,
  courses,
  emptyAction,
  emptyDescription,
  emptyTitle = 'Chưa có khoá học nào',
  title,
}: CourseListProps) {
  return (
    <section className={cn('flex flex-col gap-4.5', className)}>
      {title ? <h2 className="text-heading-accent text-xl font-semibold">{title}</h2> : null}

      {courses.length === 0 ? (
        <EmptyState
          action={emptyAction}
          description={emptyDescription}
          icon={BookOpenIcon}
          title={emptyTitle}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard course={course} key={course.id} />
          ))}
        </div>
      )}
    </section>
  )
}
