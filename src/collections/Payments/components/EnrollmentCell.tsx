'use client'

import type { DefaultCellComponentProps } from 'payload'

/**
 * `Enrollments.useAsTitle` is `student`, itself a relationship — the default
 * relationship cell can't render a label from that at `depth: 0`, so it shows
 * nothing. `Enrollments` has no other human-readable title, so this falls
 * back to the id either way, populated or not.
 */
export const EnrollmentCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  if (cellData && typeof cellData === 'object' && 'id' in cellData) {
    return <span>#{cellData.id}</span>
  }

  if (typeof cellData === 'number') {
    return <span>#{cellData}</span>
  }

  return <span>—</span>
}
