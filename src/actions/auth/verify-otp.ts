'use server'

import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'
import { verifyOtp } from '@/services/otp-store'
import type { VerifyOtpState } from './verify-otp.state'

const SESSION_EXPIRED = 'Phiên xác minh đã hết hạn. Vui lòng đăng ký lại.'

/**
 * Server action for the OTP step (§5.2). Reads the `pending_email` cookie set by
 * `registerAction`, checks the code against the Redis challenge with its 5-try
 * lockout, and on success flips the account `PENDING_VERIFICATION -> ACTIVE`,
 * stamps `verifiedAt`, and clears the cookie. The account lookup runs before
 * `verifyOtp` so a locked or disabled account never burns the code.
 */
export async function verifyOtpAction(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value
  if (!email) return { status: 'error', message: SESSION_EXPIRED }

  const otp = String(formData.get('otp') ?? '').trim()
  if (!/^\d{6}$/.test(otp)) return { status: 'error', message: 'Mã xác minh gồm 6 chữ số.' }

  try {
    const payload = await getPayload({ config: await configPromise })
    const user = (
      await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
      })
    ).docs[0]

    if (!user) return { status: 'error', message: SESSION_EXPIRED }
    if (user.status === 'DISABLED') return { status: 'error', message: 'Tài khoản này đã bị khoá.' }

    // Already verified (e.g. a double submit) — nothing to do but tidy up.
    if (user.status === 'ACTIVE') {
      ;(await cookies()).delete(PENDING_EMAIL_COOKIE)
      return { status: 'success' }
    }

    const result = await verifyOtp(email, otp)
    if (!result.ok) {
      switch (result.reason) {
        case 'expired':
          return { status: 'error', message: 'Mã đã hết hạn. Bấm "Gửi lại mã" để nhận mã mới.' }
        case 'locked':
          return {
            status: 'error',
            message: 'Bạn đã nhập sai quá nhiều lần. Bấm "Gửi lại mã" để nhận mã mới.',
          }
        case 'mismatch':
          return { status: 'error', message: `Mã không đúng. Bạn còn ${result.remaining} lần thử.` }
      }
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { status: 'ACTIVE', verifiedAt: new Date().toISOString() },
    })
  } catch (err) {
    console.error('verifyOtpAction failed', err)
    return { status: 'error', message: 'Có lỗi hệ thống. Vui lòng thử lại sau.' }
  }

  ;(await cookies()).delete(PENDING_EMAIL_COOKIE)
  return { status: 'success' }
}
