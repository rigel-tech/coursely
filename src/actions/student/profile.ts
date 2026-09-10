'use server'

import { revalidatePath } from 'next/cache'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getCurrentStudent } from '@/lib/auth/current-student'
import { parseProfileInput } from '@/lib/validation/profile-schema'

export type ProfileFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Server action to update the authenticated student's profile (US-205).
 * Updates `fullName`, `phone`, and uploads a new `avatar` if provided.
 * Enforces that students can only mutate their own record.
 */
export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const student = await getCurrentStudent()

  if (!student || student.status !== 'ACTIVE') {
    return {
      status: 'error',
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
    }
  }

  const rawFullName = formData.get('fullName')
  const rawPhone = formData.get('phone')
  const avatarFile = formData.get('avatar')

  const parsed = parseProfileInput({
    fullName: typeof rawFullName === 'string' ? rawFullName : undefined,
    phone: typeof rawPhone === 'string' ? rawPhone : undefined,
  })

  if (!parsed.ok) {
    return {
      status: 'error',
      fieldErrors: parsed.errors,
    }
  }

  const payload = await getPayload({ config: configPromise })

  let avatarMediaId: number | null = null

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!ALLOWED_MIME_TYPES.includes(avatarFile.type)) {
      return {
        status: 'error',
        fieldErrors: {
          avatar: 'Định dạng ảnh không hỗ trợ. Vui lòng chọn tệp JPG, PNG, WEBP hoặc GIF.',
        },
      }
    }

    if (avatarFile.size > MAX_AVATAR_SIZE) {
      return {
        status: 'error',
        fieldErrors: {
          avatar: 'Kích thước ảnh vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.',
        },
      }
    }

    try {
      const buffer = Buffer.from(await avatarFile.arrayBuffer())
      const mediaDoc = await payload.create({
        collection: 'media',
        data: {
          alt: `Ảnh đại diện của ${parsed.data.fullName || 'học viên'}`,
        },
        file: {
          data: buffer,
          mimetype: avatarFile.type,
          name: avatarFile.name,
          size: avatarFile.size,
        },
        overrideAccess: true,
      })
      avatarMediaId = mediaDoc.id
    } catch (err) {
      console.error('Failed to upload avatar media:', err)
      return {
        status: 'error',
        message: 'Không thể tải ảnh đại diện lên. Vui lòng thử lại.',
      }
    }
  }

  try {
    await payload.update({
      collection: 'students',
      id: student.id,
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        ...(avatarMediaId ? { avatar: avatarMediaId } : {}),
      },
      overrideAccess: true,
    })

    revalidatePath('/tai-khoan')

    return {
      status: 'success',
      message: 'Cập nhật hồ sơ thành công!',
    }
  } catch (err) {
    console.error('Failed to update student profile:', err)
    return {
      status: 'error',
      message: 'Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại sau.',
    }
  }
}
