import type { CollectionBeforeChangeHook } from 'payload'
import type { Enrollment } from '@/payload-types'

import { relationshipId } from '@/utilities/relationshipId'

/**
 * `classAssignedAt` is not staff-entered — it follows `class` automatically: stamped the
 * moment an enrollment gains a class, cleared the moment it loses one. A write that does not
 * mention `class`, or leaves it on the same class, is left alone so an unrelated edit never
 * rewrites when the student was placed.
 */
export const setClassAssignedAt: CollectionBeforeChangeHook<Enrollment> = ({
  data,
  originalDoc,
}) => {
  if (!('class' in data)) return data

  const nextClass = relationshipId(data.class)
  const currentClass = relationshipId(originalDoc?.class)

  if (nextClass === currentClass) return data

  data.classAssignedAt = nextClass ? new Date().toISOString() : null

  return data
}
