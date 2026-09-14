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
