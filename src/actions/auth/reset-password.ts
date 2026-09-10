'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { parseResetPasswordInput } from '@/lib/validation/reset-password-schema'

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
      collection: 'students',
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

    // Sessions elsewhere are not ended here: a refresh token is self-contained and
    // there is no record to revoke, so each one lives until it expires.
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
