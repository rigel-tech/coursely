import type { CollectionAfterChangeHook } from 'payload'
import { notifyClassScheduleOrStatusChange } from '@/notifications/class-lifecycle'
import { relationshipId } from '@/utilities/relationshipId'
import type { Class, Course } from '@/payload-types'

export const notifyOnClassChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  if (operation !== 'update' || !previousDoc) return doc

  const isCancelledNow = doc.status === 'CANCELLED' && previousDoc.status !== 'CANCELLED'
  const isScheduleChanged =
    doc.status !== 'CANCELLED' &&
    (doc.startDate !== previousDoc.startDate ||
      doc.endDate !== previousDoc.endDate ||
      doc.scheduleTime !== previousDoc.scheduleTime ||
      doc.location !== previousDoc.location)

  if (!isCancelledNow && !isScheduleChanged) return doc

  const courseId = relationshipId(doc.course)
  if (!courseId) return doc

  const course = await req.payload.findByID({
    collection: 'courses',
    id: courseId,
    depth: 0,
    overrideAccess: true,
  })

  if (course) {
    void notifyClassScheduleOrStatusChange({
      payload: req.payload,
      classDoc: doc as Class,
      course: course as Course,
      isCancelled: isCancelledNow,
    })
  }

  return doc
}
