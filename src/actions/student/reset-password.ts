'use server'

import { APIError, getPayload } from 'payload'
import configPromise from '@payload-config'

import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/lib/validation/reset-password-schema'
import type { ResetPasswordState } from '@/lib/constants/reset-password-state'

const INVALID_TOKEN_MESSAGE =
  'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu.'

/**
 * Server action for "reset password" — the link from the forgot-password email. Takes a
 * plain object (token, password, confirmPassword), the same as `registerAction`/
 * `loginAction` take theirs, and is called directly from `react-hook-form`'s submit
 * handler.
 *
 * `payload.resetPassword` never returns a "no user" result: it either succeeds with a
 * user, or throws `APIError('Token is either invalid or has expired.')` — see its own
 * source, which has no other way out. Catching that specific instance, the same way
 * `loginAction` catches Payload's own `AuthenticationError`, replaces the old
 * `if (!result || !result.user)` check, which could never actually be reached. Anything
 * else thrown is a real failure and is left to propagate, the same as
 * `loginAction`/`registerAction`.
 *
 * Sessions elsewhere are not ended here: a refresh token is self-contained and there is no
 * record to revoke, so each one lives until it expires.
 */
export async function resetPasswordAction(input: ResetPasswordValues): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', message: 'Vui lòng kiểm tra lại thông tin đã nhập.' }
  }

  const { token, password } = parsed.data
  const payload = await getPayload({ config: configPromise })

  try {
    await payload.resetPassword({
      collection: 'students',
      data: { token, password },
      overrideAccess: true,
    })
  } catch (err) {
    if (err instanceof APIError) return { status: 'error', message: INVALID_TOKEN_MESSAGE }
    throw err
  }

  return {
    status: 'success',
    message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.',
  }
}
