import type { DefaultServerCellComponentProps } from 'payload'
import type { Student } from '@/payload-types'

/**
 * `Students.useAsTitle` is `email` (needed elsewhere for sign-in identification),
 * so Payload's default relationship cell would show email here too. The
 * Payments list favours the human name instead — email only as a fallback
 * for a student with no `fullName` set.
 *
 * A server component (no `use client`) rather than an `afterRead` hook on the
 * collection: the list view is the only read path that ever hands this `cellData`
 * as a bare id (`depth: 0`, hard-coded — see INVARIANTS.md), so resolving it here
 * keeps every other read path (REST, Local API, GraphQL) returning what its own
 * `depth` asked for.
 */
export const StudentCell = async ({ cellData, payload }: DefaultServerCellComponentProps) => {
  if (cellData && typeof cellData === 'object') {
    const student = cellData as Student
    return <span>{student.fullName || student.email}</span>
  }

  if (typeof cellData === 'number') {
    let student: Student | null = null
    try {
      student = await payload.findByID({
        collection: 'students',
        id: cellData,
        depth: 0,
      })
    } catch (err) {
      payload.logger.error(err, `StudentCell: failed to resolve student #${cellData}`)
    }

    return student ? <span>{student.fullName || student.email}</span> : <span>#{cellData}</span>
  }

  return <span>—</span>
}
