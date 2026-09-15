'use server'

import { revalidatePath } from 'next/cache'

import { getSessionStudent } from '@/lib/auth/session-student'
import { profileSchema } from '@/lib/validation/profile-schema'
import type { ProfileState } from '@/lib/constants/profile-state'
import { updateStudentProfileWithAvatar } from '@/services/student-profile'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Server action to update the authenticated student's profile (US-205). Updates
 * `fullName` and `phone`, and uploads a new `avatar` if one was chosen — the write itself,
 * transaction included, lives in `updateStudentProfileWithAvatar`; this only authenticates,
 * validates, and reports the outcome.
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
  const avatar = avatarFile instanceof File && avatarFile.size > 0 ? avatarFile : undefined

  if (avatar) {
    if (!ALLOWED_MIME_TYPES.includes(avatar.type)) {
      return {
        status: 'error',
        message: 'Định dạng ảnh không hỗ trợ. Vui lòng chọn tệp JPG, PNG, WEBP hoặc GIF.',
      }
    }
    if (avatar.size > MAX_AVATAR_SIZE) {
      return { status: 'error', message: 'Kích thước ảnh vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.' }
    }
  }

  await updateStudentProfileWithAvatar(student.id, fullName, phone, avatar)

  revalidatePath('/tai-khoan')

  return { status: 'success', message: 'Cập nhật hồ sơ thành công!' }
}
