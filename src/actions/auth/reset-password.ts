'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { parseResetPasswordInput } from '@/lib/validation/reset-password-schema'
import { revokeAllForUser } from '@/services/session-store'

export type ResetPasswordFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
}

export async function resetPasswordAction(
  _prev: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const parsed = parseResetPasswordInput({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: parsed.fieldErrors,
    }
  }

  const { token, password } = parsed.data

  try {
    const payload = await getPayload({ config: configPromise })

    const result = await payload.resetPassword({
      collection: 'users',
      data: {
        token,
        password,
      },
      overrideAccess: true,
    })

    if (!result || !result.user) {
      return {
        status: 'error',
        message:
          'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu.',
      }
    }

    // Revoke all existing active sessions on other devices for this user
    try {
      if (typeof result.user.id === 'number') {
        await revokeAllForUser(result.user.id)
      }
    } catch (err) {
      console.error('Failed to revoke sessions after password reset:', err)
    }

    return {
      status: 'success',
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.',
    }
  } catch (err) {
    console.error('resetPasswordAction failed:', err)
    return {
      status: 'error',
      message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu.',
    }
  }
}
