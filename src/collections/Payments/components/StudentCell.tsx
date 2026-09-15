'use client'

import type { DefaultCellComponentProps } from 'payload'
import type { Student } from '@/payload-types'

/**
 * `Students.useAsTitle` is `email` (needed elsewhere for sign-in identification),
 * so Payload's default relationship cell would show email here too. The
 * Payments list favours the human name instead — email only as a fallback
 * for a student with no `fullName` set.
 */
export const StudentCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  if (cellData && typeof cellData === 'object') {
    const student = cellData as Student
    return <span>{student.fullName || student.email}</span>
  }

  if (typeof cellData === 'number') {
    return <span>#{cellData}</span>
  }

  return <span>—</span>
}
