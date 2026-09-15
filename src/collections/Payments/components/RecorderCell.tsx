'use client'

import type { DefaultCellComponentProps } from 'payload'
import type { User } from '@/payload-types'

/**
 * Same pattern as `StudentCell.tsx`, for the `userId` relationship instead of
 * `studentId`. `Users.useAsTitle` is `email`, so the default relationship cell
 * would show email here too — this favours the human name, falling back to
 * email for a staff account with no `fullName` set.
 */
export const RecorderCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  if (cellData && typeof cellData === 'object') {
    const user = cellData as User
    return <span>{user.fullName || user.email}</span>
  }

  if (typeof cellData === 'number') {
    return <span>#{cellData}</span>
  }

  return <span>—</span>
}
