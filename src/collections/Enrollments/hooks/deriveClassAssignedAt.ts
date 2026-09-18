import type { CollectionBeforeChangeHook } from 'payload'

const relId = (v: unknown): unknown => (v && typeof v === 'object' ? (v as { id: unknown }).id : v)

/**
 * Stamps the moment a class is assigned to an enrollment — when the `class` field goes from
 * unset to set on this save. Unrelated to `enrollmentStatus`; an enrollment can be assigned
 * a class independently of what status it is in.
 */
export const deriveClassAssignedAt: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation === 'create') return data

  const previousClass = relId(originalDoc?.class)
  const nextClass = relId('class' in data ? data.class : originalDoc?.class)

  if (!previousClass && nextClass) {
    data.classAssignedAt = new Date().toISOString()
  }

  return data
}
