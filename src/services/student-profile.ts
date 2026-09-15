'use server'

import configPromise from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'

/**
 * The one write for a student's own `fullName`/`phone` (and, from the account page, its
 * `avatar`). Shared by registration-time enrollment (specs/009) and `/tai-khoan`'s own
 * profile edit (`updateProfileAction`) — `options.req` lets the latter join its own
 * transaction, and `options.avatarMediaId` lets it set a freshly-uploaded avatar in the
 * same write instead of a second one.
 */
export async function updateStudentProfile(
  studentId: number,
  fullName: string | undefined,
  phone: string | null,
  options?: { avatarMediaId?: number; req?: Partial<PayloadRequest> },
): Promise<void> {
  const payload = await getPayload({ config: configPromise })

  await payload.update({
    collection: 'students',
    id: studentId,
    data: {
      fullName,
      phone,
      ...(options?.avatarMediaId !== undefined ? { avatar: options.avatarMediaId } : {}),
    },
    overrideAccess: true,
    req: options?.req,
  })
}

/**
 * `updateProfileAction`'s (`/tai-khoan`) own write: uploads `avatarFile` (if given) as a new
 * Media doc, then sets it on the student alongside `fullName`/`phone` — both in one
 * transaction, so a failed profile save leaves no orphaned avatar upload behind.
 */
export async function updateStudentProfileWithAvatar(
  studentId: number,
  fullName: string | undefined,
  phone: string | null,
  avatarFile?: File,
): Promise<void> {
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

    await updateStudentProfile(studentId, fullName, phone, { avatarMediaId, req })

    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}
