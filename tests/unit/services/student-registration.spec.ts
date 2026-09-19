import { describe, expect, it, vi } from 'vitest'

import { getPayload } from 'payload'
import { registerStudent } from '@/services/student-registration'
import type { RegisterInput } from '@/lib/validation/register-schema'

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: vi.fn(),
}))
vi.mock('@/services/student-verification-otp', () => ({
  sendVerificationOtp: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('@/email/send', () => ({
  sendDuplicateAttemptEmail: vi.fn().mockResolvedValue(undefined),
  sendEnrollmentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendEnrollmentCancellationEmail: vi.fn().mockResolvedValue(undefined),
  sendEnrollmentConfirmedEmail: vi.fn().mockResolvedValue(undefined),
}))

describe('student registration notifications', () => {
  it('creates the student even when the welcome notification write fails, and logs the failure', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: 9, fullName: 'Học viên A', email: 'a@example.com' })
      .mockRejectedValueOnce(new Error('notifications insert failed'))
    const logger = { error: vi.fn(), warn: vi.fn() }
    vi.mocked(getPayload).mockResolvedValue({
      create,
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger,
    } as never)

    const input: RegisterInput = {
      email: 'a@example.com',
      password: 'Passw0rd123',
      fullName: 'Học viên A',
      phone: '0912345678',
    }

    await expect(registerStudent(input)).resolves.toEqual({ ok: true, email: 'a@example.com' })

    // Flushes the fire-and-forget notification write's rejection handler.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('ACCOUNT_CREATED notification'),
    )
  })
})
