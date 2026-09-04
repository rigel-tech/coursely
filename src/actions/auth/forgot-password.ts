'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { parseForgotPasswordInput } from '@/lib/validation/forgot-password-schema'
import { sendResetPasswordEmail } from '@/email/send'

export type ForgotPasswordFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Record<string, string>
}

const SUCCESS_MESSAGE =
  'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra hộp thư (kể cả thư mục Spam/Rác).'

export async function forgotPasswordAction(
  _prev: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const parsed = parseForgotPasswordInput({
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: parsed.fieldErrors,
    }
  }

  const { email } = parsed.data

  try {
    const payload = await getPayload({ config: configPromise })

    // Payload generates a resetPasswordToken on the user record when found
    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
    })

    if (token) {
      const baseUrl =
        process.env.NEXT_PUBLIC_SERVER_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : 'http://localhost:3000')
      const resetUrl = `${baseUrl}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`

      try {
        await sendResetPasswordEmail(payload, email, resetUrl)
      } catch (err) {
        console.error('Failed to send reset password email:', err)
      }
    }
  } catch (err) {
    // If Payload throws because email is not found or other reason, we log and still return success
    // to strictly preserve anti-enumeration guarantees (AC-6).
    console.warn('forgotPasswordAction error (suppressed for security):', err)
  }

  return {
    status: 'success',
    message: SUCCESS_MESSAGE,
  }
}
