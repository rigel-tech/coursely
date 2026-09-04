import Link from 'next/link'
import * as React from 'react'

import { Badge } from '@/components/public/ui/badge'
import { cn } from '@/utilities/ui'

/** Difficulty band. Kept as a union rather than a free string so the badge cannot fall through. */
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
  /** Pre-formatted, e.g. "8 tuần" — the caller owns pluralisation and locale. */
  duration?: string
  /** Pre-formatted, e.g. "2.400.000 ₫". Omit for a free course. */
  price?: string
  /** Cover image URL. A card without one keeps its shape and shows a tinted block. */
  imageUrl?: string | null
  /** Where clicking the card goes. */
  href: string
}

export type CourseCardProps = {
  course: CourseSummary
  className?: string
}

/**
 * One course, as it appears in a listing.
 *
 * The whole card is a single link: the title carries the accessible name and a stretched
 * overlay makes the rest of the surface clickable, so there is only one tab stop rather
 * than one per element.
 *
 * `price` and `duration` arrive already formatted — this component does no number or
 * currency formatting, because that is a locale decision belonging to the caller.
 *
 * @example
 * ```tsx
 * <CourseCard
 *   course={{
 *     id: course.id,
 *     title: course.title,
 *     excerpt: course.summary,
 *     level: 'beginner',
 *     duration: '8 tuần',
 *     price: formatVnd(course.price),
 *     imageUrl: course.cover?.url,
 *     href: `/khoa-hoc/${course.slug}`,
 *   }}
 * />
 * ```
 */
export function CourseCard({ className, course }: CourseCardProps) {
  return (
    <article
      className={cn(
        'group border-border bg-card relative flex flex-col overflow-hidden rounded-lg border transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="bg-muted aspect-video w-full overflow-hidden">
        {course.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="size-full object-cover transition-transform group-hover:scale-105"
            src={course.imageUrl}
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4.5">
        {course.level ? (
          <Badge className="self-start" variant="outline">
            {LEVEL_LABEL[course.level]}
          </Badge>
        ) : null}

        <h3 className="text-heading-accent text-lg font-semibold">
          <Link className="after:absolute after:inset-0" href={course.href}>
            {course.title}
          </Link>
        </h3>

        {course.excerpt ? (
          <p className="text-muted-foreground line-clamp-3 text-sm">{course.excerpt}</p>
        ) : null}

        <div className="text-muted-foreground-subtle mt-auto flex items-center justify-between pt-2 text-xs">
          <span>{course.duration}</span>
          {course.price ? (
            <span className="text-foreground font-mono text-sm font-semibold">{course.price}</span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
