import configPromise from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import type { Student } from '@/payload-types'

/**
 * Shared by `updateStudentProfile` and `updateStudentProfileWithAvatar` — each destructures
 * only the fields it uses. `avatarMediaId` is `updateStudentProfile`'s own (an id already on
 * hand); `avatarFile` is `updateStudentProfileWithAvatar`'s (a file still to upload); `req`
 * lets a caller join its own transaction.
 */
export type StudentProfileWrite = {
  studentId: number
  fullName: string | undefined
  phone: string | null
  avatarMediaId?: number
  avatarFile?: File
  req?: Partial<PayloadRequest>
}

/**
 * The one write for a student's own `fullName`/`phone` (and, from the account page, its
 * `avatar`). Shared by registration-time enrollment (specs/009) and `/tai-khoan`'s own
 * profile edit (`updateProfileAction`) — `options.req` lets the latter join its own
 * transaction, and `options.avatarMediaId` lets it set a freshly-uploaded avatar in the
 * same write instead of a second one.
 */
export async function updateStudentProfile({
  studentId,
  fullName,
  phone,
  avatarMediaId,
  req,
}: StudentProfileWrite): Promise<Student> {
  const payload = await getPayload({ config: configPromise })

  return payload.update({
    collection: 'students',
    id: studentId,
    data: {
      fullName,
      phone,
      ...(avatarMediaId !== undefined ? { avatar: avatarMediaId } : {}),
    },
    overrideAccess: true,
    req,
  })
}

/**
 * `updateProfileAction`'s (`/tai-khoan`) own write: uploads `avatarFile` (if given) as a new
 * Media doc, then sets it on the student alongside `fullName`/`phone` — both in one
 * transaction, so a failed profile save leaves no orphaned avatar upload behind.
 */
export async function updateStudentProfileWithAvatar({
  studentId,
  fullName,
  phone,
  avatarFile,
}: StudentProfileWrite): Promise<Student> {
  const payload = await getPayload({ config: configPromise })
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { transactionID }

  try {
    let avatarMediaId: number | undefined

    if (avatarFile) {
      const mediaDoc = await payload.create({
        collection: 'media',
        data: { alt: `Ảnh đại diện của ${fullName || 'học viên'}` },
        file: {
          data: Buffer.from(await avatarFile.arrayBuffer()),
          mimetype: avatarFile.type,
          name: avatarFile.name,
          size: avatarFile.size,
        },
        overrideAccess: true,
        req,
      })
      avatarMediaId = mediaDoc.id
    }

    const student = await updateStudentProfile({ studentId, fullName, phone, avatarMediaId, req })

    if (transactionID) await payload.db.commitTransaction(transactionID)

    return student
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}
