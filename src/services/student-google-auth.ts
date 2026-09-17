import { randomBytes } from 'node:crypto'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import configPromise from '@payload-config'

import type { GoogleUserInfo } from '@/lib/auth/google-oauth'
import type { Student } from '@/payload-types'

export type GoogleAuthOutcome = { kind: 'authenticated'; student: Student } | { kind: 'disabled' }

export async function handleGoogleStudentAuth(
  googleUser: GoogleUserInfo,
): Promise<GoogleAuthOutcome> {
  const email = googleUser.email.trim().toLowerCase()
  const payload = await getPayload({ config: await configPromise })

  const existing = (
    await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]

  if (existing?.status === 'DISABLED') {
    payload.logger.warn({ email }, 'Google login attempt on a DISABLED account')
    return { kind: 'disabled' }
  }

  if (existing) {
    const updated = await payload.update({
      collection: 'students',
      id: existing.id,
      data: {
        lastLoginAt: new Date().toISOString(),
        ...(existing.status === 'PENDING_VERIFICATION'
          ? { status: 'ACTIVE', verifiedAt: new Date().toISOString() }
          : {}),
      },
      overrideAccess: true,
    })
    return { kind: 'authenticated', student: updated }
  }

  const newStudent = await createActiveGoogleStudent(payload, {
    email,
    fullName: googleUser.name,
    picture: googleUser.picture,
  })

  return { kind: 'authenticated', student: newStudent }
}

async function createActiveGoogleStudent(
  payload: Payload,
  data: { email: string; fullName: string; picture?: string },
): Promise<Student> {
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { transactionID }
  try {
    let avatarMediaId: number | undefined
    if (data.picture) {
      const avatarFile = await fetchGoogleAvatarFile(data.picture, data.fullName)
      if (avatarFile) {
        const mediaDoc = await payload.create({
          collection: 'media',
          data: { alt: `Ảnh đại diện của ${data.fullName}` },
          file: avatarFile,
          overrideAccess: true,
          req,
        })
        avatarMediaId = mediaDoc.id
      }
    }
    const student = await payload.create({
      collection: 'students',
      data: {
        email: data.email,
        fullName: data.fullName,
        password: randomBytes(32).toString('hex'),
        status: 'ACTIVE',
        verifiedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        ...(avatarMediaId ? { avatar: avatarMediaId } : {}),
      },
      overrideAccess: true,
      req,
    })

    if (transactionID) await payload.db.commitTransaction(transactionID)

    payload
      .create({
        collection: 'notifications',
        data: {
          student: student.id,
          type: 'ACCOUNT_CREATED',
          title: 'Chào mừng bạn đến với Coursely',
          content: 'Tài khoản của bạn đã được liên kết và kích hoạt thành công qua Google.',
          isRead: false,
        },
        overrideAccess: true,
      })
      .catch((err) => {
        payload.logger.error({ err }, 'Lỗi tạo thông báo chào mừng cho học viên')
      })

    return student
  } catch (err) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw err
  }
}

async function fetchGoogleAvatarFile(pictureUrl: string, name: string) {
  try {
    const res = await fetch(pictureUrl)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimetype = res.headers.get('content-type') || 'image/jpeg'
    const extension = mimetype.includes('png') ? 'png' : 'jpg'
    return {
      data: buffer,
      mimetype,
      name: `google-avatar-${Date.now()}.${extension}`,
      size: buffer.length,
    }
  } catch (error) {
    return null
  }
}
