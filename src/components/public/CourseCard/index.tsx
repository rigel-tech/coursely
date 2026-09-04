import Link from 'next/link'
import * as React from 'react'

import { Badge } from '@/components/public/ui/badge'
import { cn } from '@/utilities/ui'

/** Difficulty band. */
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
}

export type CourseSummary = {
  id: string | number
  title: string
  /** One or two sentences. Clamped to three lines in the card. */
  excerpt?: string
  level?: CourseLevel
  /** Category title or name */
  categoryName?: string
  /** Tags associated with the course */
  tags?: string[]
  /** Pre-formatted, e.g. "8 tuần". */
  duration?: string
  /** Pre-formatted, e.g. "2.400.000 ₫". Omit for a free course. */
  price?: string
  /** Cover image URL. */
  imageUrl?: string | null
  /** Where clicking the card goes. */
  href: string
}

export type CourseCardProps = {
  course: CourseSummary
  className?: string
}

/**
 * Public course card component (US-101 / US-103).
 */
export function CourseCard({ className, course }: CourseCardProps) {
  return (
    <article
      className={cn(
        'group border-border bg-card relative flex flex-col overflow-hidden rounded-lg border transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="bg-muted aspect-video w-full overflow-hidden relative">
        {course.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={course.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={course.imageUrl}
          />
        ) : (
          <div className="size-full flex items-center justify-center bg-muted text-muted-foreground text-sm font-medium">
            Coursely
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {course.categoryName && (
            <Badge variant="brand" className="self-start font-medium">
              {course.categoryName}
            </Badge>
          )}
          {course.level && (
            <Badge className="self-start" variant="outline">
              {LEVEL_LABEL[course.level]}
            </Badge>
          )}
        </div>

        <h3 className="text-heading-accent text-lg font-semibold line-clamp-2">
          <Link className="after:absolute after:inset-0" href={course.href}>
            {course.title}
          </Link>
        </h3>

        {course.excerpt && (
          <p className="text-muted-foreground line-clamp-3 text-sm">{course.excerpt}</p>
        )}

        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {course.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="text-muted-foreground-subtle mt-auto flex items-center justify-between pt-3 text-xs border-t border-border/50">
          <span>{course.duration || 'Linh hoạt'}</span>
          {course.price && (
            <span className="text-foreground font-mono text-sm font-semibold">{course.price}</span>
          )}
        </div>
      </div>
    </article>
  )
}
