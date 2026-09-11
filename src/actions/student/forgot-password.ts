'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { emailSchema } from '@/lib/validation/forgot-password-schema'
import { sendResetPasswordEmail } from '@/email/send'
import { getServerSideURL } from '@/utilities/getURL'
import type { ForgotPasswordState } from '@/lib/constants/forgot-password-state'

const SUCCESS_MESSAGE =
  'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra hộp thư (kể cả thư mục Spam/Rác).'

/**
 * Server action for "forgot password". Orchestration only: validate, ask Payload for a
 * reset token, email it if one comes back.
 *
 * Takes the address directly, not an object — there is exactly one field, so there is
 * nothing to bundle. The form calls this from `react-hook-form`'s submit handler, the
 * same as `loginAction`/`registerAction`, just with one argument instead of one object.
 * `emailSchema.safeParse` runs directly here — the type says nothing at runtime about
 * what a hand-built request sends.
 *
 * `payload.forgotPassword` never throws for an address with no account — it commits an
 * empty transaction and returns `null` (its own source: revealing that distinction would
 * expose which emails are registered). So there is nothing here to swallow on that path; an
 * actual thrown error is a real failure and is left to propagate, the same as
 * `loginAction`/`registerAction`.
 *
 * The one exception is `sendResetPasswordEmail`: an address that does exist but whose mail
 * fails to send must still get the same response an unknown address gets, or the
 * difference — success vs. a system-failure banner — becomes the enumeration signal
 * Payload's own `null` return exists to avoid. That failure is logged and swallowed, not
 * thrown.
 */
export async function forgotPasswordAction(rawEmail: string): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(rawEmail)
  if (!parsed.success) {
    return { status: 'error', message: 'Vui lòng nhập một địa chỉ email hợp lệ.' }
  }

  const email = parsed.data
  const payload = await getPayload({ config: configPromise })

  const token = await payload.forgotPassword({
    collection: 'students',
    data: { email },
    disableEmail: true,
  })

  if (token) {
    const resetUrl = `${getServerSideURL()}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`
    await sendResetPasswordEmail(payload, email, resetUrl).catch((err) =>
      payload.logger.error({ err }, 'RESET_PASSWORD_EMAIL send failed'),
    )
  }

  return { status: 'success', message: SUCCESS_MESSAGE }
}
