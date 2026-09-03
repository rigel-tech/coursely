import * as React from 'react'

import { Avatar } from '@/components/design/ui/avatar'
import { Badge } from '@/components/public/ui/badge'
import { cn } from '@/utilities/ui'

export type TeacherProfile = {
  id: string | number
  name: string
  /** Role or credential line, e.g. "IELTS 8.5 · 6 năm giảng dạy". */
  headline?: string
  /** Short biography. Two or three sentences reads best at this width. */
  bio?: string
  photoUrl?: string | null
  /** Subjects or skills, rendered as pills. */
  specialities?: string[]
}

export type SpotlightTeacherProps = {
  teacher: TeacherProfile
  /** Anything the caller wants under the bio — a link to the full profile, a CTA. */
  action?: React.ReactNode
  className?: string
}

/**
 * Feature panel for a single teacher: portrait, credential line, biography and specialities.
 *
 * Everything except `name` is optional, and the layout holds together with any subset — a
 * teacher with no photo gets initials from {@link Avatar}, and a missing bio simply closes
 * the gap rather than leaving a hole.
 *
 * @example
 * ```tsx
 * <SpotlightTeacher
 *   teacher={{
 *     id: teacher.id,
 *     name: 'Nguyễn Văn Tuấn',
 *     headline: 'IELTS 8.5 · 6 năm giảng dạy',
 *     bio: 'Chuyên luyện phát âm và phản xạ giao tiếp cho người đi làm.',
 *     photoUrl: teacher.photo?.url,
 *     specialities: ['Giao tiếp', 'IELTS Speaking', 'Phát âm'],
 *   }}
 *   action={<Button variant="link">Xem hồ sơ</Button>}
 * />
 * ```
 */
export function SpotlightTeacher({ action, className, teacher }: SpotlightTeacherProps) {
  return (
    <article
      className={cn(
        'border-border bg-card flex flex-col items-center gap-4 rounded-lg border p-5.5 text-center sm:flex-row sm:items-start sm:text-left',
        className,
      )}
    >
      <Avatar name={teacher.name} size="lg" src={teacher.photoUrl} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-heading-accent text-lg font-semibold">{teacher.name}</h3>
          {teacher.headline ? (
            <p className="text-muted-foreground text-sm">{teacher.headline}</p>
          ) : null}
        </div>

        {teacher.bio ? <p className="text-foreground text-sm">{teacher.bio}</p> : null}

        {teacher.specialities?.length ? (
          <ul className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {teacher.specialities.map((speciality) => (
              <li key={speciality}>
                <Badge variant="outline">{speciality}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </article>
  )
}
