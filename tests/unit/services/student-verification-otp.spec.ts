import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import { issueOtp, resendOtp } from '@/services/otp-challenge'
import { sendVerifyOtpEmail } from '@/email/send'
import { sendVerificationOtp } from '@/services/student-verification-otp'

vi.mock('@/services/otp-challenge', () => ({
  issueOtp: vi.fn(),
  resendOtp: vi.fn(),
}))

vi.mock('@/email/send', () => ({
  sendVerifyOtpEmail: vi.fn(),
}))

const payload = {
  logger: { error: vi.fn() },
} as unknown as Payload

describe('sendVerificationOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendVerifyOtpEmail).mockResolvedValue(undefined)
  })

  it('issues and sends an OTP for initial registration', async () => {
    vi.mocked(issueOtp).mockResolvedValue('123456')

    await expect(sendVerificationOtp(payload, 'student@example.com', 'initial')).resolves.toEqual({
      ok: true,
    })

    expect(issueOtp).toHaveBeenCalledWith(payload, 'student@example.com')
    expect(sendVerifyOtpEmail).toHaveBeenCalledWith(payload, 'student@example.com', '123456')
  })

  it('uses the shared cooldown path for login and manual resend', async () => {
    vi.mocked(resendOtp).mockResolvedValue({ ok: true, otp: '654321' })

    await expect(sendVerificationOtp(payload, 'student@example.com', 'resend')).resolves.toEqual({
      ok: true,
    })

    expect(resendOtp).toHaveBeenCalledWith(payload, 'student@example.com')
    expect(sendVerifyOtpEmail).toHaveBeenCalledWith(payload, 'student@example.com', '654321')
  })

  it('does not send when the shared cooldown rejects the request', async () => {
    vi.mocked(resendOtp).mockResolvedValue({ ok: false, reason: 'cooldown' })

    await expect(sendVerificationOtp(payload, 'student@example.com', 'resend')).resolves.toEqual({
      ok: false,
      reason: 'cooldown',
    })

    expect(sendVerifyOtpEmail).not.toHaveBeenCalled()
  })

  it('logs asynchronous email failures without rejecting the caller', async () => {
    vi.mocked(issueOtp).mockResolvedValue('123456')
    vi.mocked(sendVerifyOtpEmail).mockRejectedValue(new Error('mail failed'))

    await expect(sendVerificationOtp(payload, 'student@example.com', 'initial')).resolves.toEqual({
      ok: true,
    })

    await vi.waitFor(() => {
      expect(payload.logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        'EMAIL_VERIFY_OTP send failed',
      )
    })
  })
})
