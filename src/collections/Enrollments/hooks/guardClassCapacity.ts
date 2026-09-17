import type { CollectionBeforeChangeHook } from 'payload'
import type { Enrollment } from '@/payload-types'

import { ClassCourseMismatch, ClassFull } from '@/lib/errors/enrollment'
import { countClassOccupancy, lockClassSeats } from '@/services/class-seats'
import { relationshipId } from '@/utilities/relationshipId'

/**
 * The seat guard, on the collection rather than on any one screen: every write that puts an
 * enrollment into a class goes through here — the class-assignment endpoint, an admin editing
 * a single enrollment, the list view's bulk edit, a raw REST call.
 *
 * `lockClassSeats` is what makes the count trustworthy: without it two concurrent writes both
 * read "one seat left" and both take it. See `src/services/class-seats.ts`.
 */
export const guardClassCapacity: CollectionBeforeChangeHook<Enrollment> = async ({
  data,
  originalDoc,
  req,
}) => {
  const nextClass = relationshipId(data.class)

  if (!nextClass) return data
  if (nextClass === relationshipId(originalDoc?.class)) return data

  const { payload } = req
  const classDoc = await payload.findByID({
    collection: 'classes',
    id: nextClass,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const course = relationshipId(data.course) ?? relationshipId(originalDoc?.course)
  if (course !== relationshipId(classDoc.course)) throw new ClassCourseMismatch()

  await lockClassSeats({ classId: nextClass, req })

  const taken = await countClassOccupancy({ classId: nextClass, req })
  if (taken >= classDoc.maxStudents) throw new ClassFull({ remaining: 0 })

  return data
}
