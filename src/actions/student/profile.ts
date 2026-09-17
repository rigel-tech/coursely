'use server'

import { revalidatePath } from 'next/cache'
import configPromise from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'

import { getSessionStudent } from '@/lib/auth/session-student'
import { profileSchema } from '@/lib/validation/profile-schema'
import type { ProfileState } from '@/lib/constants/profile-state'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Server action to update the authenticated student's profile (US-205). Updates
 * `fullName` and `phone`, and uploads a new `avatar` if one was chosen.
 *
 * Takes `FormData`, not a plain object: `avatar` is a `File`, and Next's documented
 * Server Action pattern for a file is `FormData`, so `<ProfileForm>` builds one inside
 * its `react-hook-form` submit handler rather than relying on `<form action>`.
 * `profileSchema.safeParse` runs directly here, the same one `<ProfileForm>`'s
 * `zodResolver` runs — the type says nothing at runtime about what a hand-built request
 * sends.
 *
 * An unexpected failure — the avatar upload, or the save itself — leaves by `throw`, the
 * same way `registerAction`/`resetPasswordAction` do. `<ProfileForm>` catches it and
 * shows a system-failure banner.
 */
export async function updateProfileAction(formData: FormData): Promise<ProfileState> {
  const student = await getSessionStudent()
  if (!student || student.status !== 'ACTIVE') {
    return {
      status: 'error',
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
    }
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
  })
  if (!parsed.success) {
    return { status: 'error', message: 'Vui lòng kiểm tra lại thông tin đã nhập.' }
  }

  const fullName = parsed.data.fullName.trim() || undefined
  const phone = parsed.data.phone.trim() || null
  const avatarFile = formData.get('avatar')

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!ALLOWED_MIME_TYPES.includes(avatarFile.type)) {
      return {
        status: 'error',
        message: 'Định dạng ảnh không hỗ trợ. Vui lòng chọn tệp JPG, PNG, WEBP hoặc GIF.',
      }
    }
    if (avatarFile.size > MAX_AVATAR_SIZE) {
      return { status: 'error', message: 'Kích thước ảnh vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.' }
    }
  }

  const payload = await getPayload({ config: configPromise })
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req: Partial<PayloadRequest> = { transactionID }
  try {
    let avatarMediaId: number | undefined
    const oldAvatarId =
      typeof student.avatar === 'object' && student.avatar !== null
        ? student.avatar?.id
        : student.avatar
    if (avatarFile instanceof File && avatarFile.size > 0) {
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
    await payload.update({
      collection: 'students',
      id: student.id,
      data: { fullName, phone, ...(avatarMediaId ? { avatar: avatarMediaId } : {}) },
      overrideAccess: true,
      req,
    })

    if (avatarMediaId && oldAvatarId && oldAvatarId !== avatarMediaId) {
      await payload.delete({
        collection: 'media',
        id: oldAvatarId,
        overrideAccess: true,
        req,
      })
    }
    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    throw error
  }

  revalidatePath('/tai-khoan')

  return { status: 'success', message: 'Cập nhật hồ sơ thành công!' }
}
