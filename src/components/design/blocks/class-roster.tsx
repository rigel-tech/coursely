import { UsersIcon } from 'lucide-react'
import * as React from 'react'

import { Avatar } from '@/components/public/ui/avatar'
import { EmptyState } from '@/components/design/ui/empty-state'
import { Badge } from '@/components/public/ui/badge'
import { cn } from '@/utilities/ui'

/** Where a learner stands in the class. Drives the badge colour, so it is a closed union. */
export type EnrolmentStatus = 'active' | 'pending' | 'withdrawn'

const STATUS: Record<EnrolmentStatus, { label: string; variant: 'success' | 'warning' | 'error' }> =
  {
    active: { label: 'Đang học', variant: 'success' },
    pending: { label: 'Chờ xác nhận', variant: 'warning' },
    withdrawn: { label: 'Đã nghỉ', variant: 'error' },
  }

export type RosterEntry = {
  id: string | number
  name: string
  email?: string
  photoUrl?: string | null
  status: EnrolmentStatus
  /** Pre-formatted joining date, e.g. "12/03/2026". Formatting is a locale decision. */
  joinedAt?: string
}

export type ClassRosterProps = {
  students: RosterEntry[]
  /** Optional caption above the table, e.g. the class name. */
  title?: string
  className?: string
}

/**
 * Table of the learners in one class, with enrolment status.
 *
 * A real `<table>` rather than a grid of divs: this is tabular data, and screen readers
 * need the row/column relationship to read a status next to the right name. The table
 * scrolls inside its own container so a narrow viewport never widens the page.
 *
 * @example
 * ```tsx
 * <ClassRoster
 *   title="Lớp Giao tiếp A1 — Ca tối T2/T4"
 *   students={enrolments.map((e) => ({
 *     id: e.id,
 *     name: e.student.fullName,
 *     email: e.student.email,
 *     photoUrl: e.student.photo?.url,
 *     status: e.status,
 *     joinedAt: formatDate(e.createdAt),
 *   }))}
 * />
 * ```
 */
export function ClassRoster({ className, students, title }: ClassRosterProps) {
  if (students.length === 0) {
    return (
      <EmptyState
        className={className}
        description="Học viên ghi danh vào lớp sẽ xuất hiện ở đây."
        icon={UsersIcon}
        title="Lớp chưa có học viên"
      />
    )
  }

  return (
    <div className={cn('border-border bg-card overflow-hidden rounded-lg border', className)}>
      {title ? (
        <h3 className="text-heading-accent border-border border-b px-4.5 py-3.5 text-base font-semibold">
          {title}
        </h3>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground-subtle border-border border-b text-xs uppercase">
            <tr>
              <th className="px-4.5 py-2.5 font-medium" scope="col">
                Học viên
              </th>
              <th className="px-4.5 py-2.5 font-medium" scope="col">
                Trạng thái
              </th>
              <th className="px-4.5 py-2.5 font-medium" scope="col">
                Ngày vào
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-4.5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={student.name} size="sm" src={student.photoUrl} />
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium">{student.name}</span>
                      {student.email ? (
                        <span className="text-muted-foreground-subtle text-xs">
                          {student.email}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4.5 py-3">
                  <Badge variant={STATUS[student.status].variant}>
                    {STATUS[student.status].label}
                  </Badge>
                </td>
                <td className="text-muted-foreground px-4.5 py-3 font-mono text-xs">
                  {student.joinedAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
