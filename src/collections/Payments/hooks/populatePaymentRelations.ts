import type { CollectionAfterReadHook } from 'payload'

/**
 * The admin list view always reads at `depth: 0` (hard-coded in
 * `@payloadcms/next`'s List view, not configurable per collection), so
 * `studentId`/`userId` arrive as bare numbers there — `StudentCell`/
 * `RecorderCell` would fall back to showing the raw id. Resolving them here,
 * mirroring `Posts/hooks/populateAuthors.ts`, makes every read return the
 * populated doc regardless of the caller's `depth`.
 */
export const populatePaymentRelations: CollectionAfterReadHook = async ({
  doc,
  req: { payload },
}) => {
  if (doc?.studentId && typeof doc.studentId !== 'object') {
    try {
      doc.studentId = await payload.findByID({
        collection: 'students',
        id: doc.studentId,
        depth: 0,
      })
    } catch {
      // swallow error — leave the raw id in place
    }
  }

  if (doc?.userId && typeof doc.userId !== 'object') {
    try {
      doc.userId = await payload.findByID({
        collection: 'users',
        id: doc.userId,
        depth: 0,
      })
    } catch {
      // swallow error — leave the raw id in place
    }
  }

  return doc
}
