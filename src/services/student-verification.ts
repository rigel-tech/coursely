/**
 * Registration-verification domain logic (§5.2). No HTTP concerns — the caller
 * owns the `pending_email` cookie. Given an `(email, otp)` pair this checks the
 * stored challenge with its 5-try lockout and, on a correct code, flips the
 * account `PENDING_VERIFICATION -> ACTIVE` and stamps `verifiedAt`. The account
 * lookup runs before `verifyOtp` so a disabled account never burns the code, and
 * an already-`ACTIVE` account resolves `ok` without reading the challenge at all.
 */
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { verifyOtp } from '@/services/otp-challenge'

export type VerifyRegistrationResult =
  | { ok: true; student: { id: number; status?: string } }
  | { ok: false; reason: 'session_expired' | 'disabled' | 'expired' | 'locked' }
  | { ok: false; reason: 'mismatch'; remaining: number }

export async function verifyRegistration(
  email: string,
  otp: string,
): Promise<VerifyRegistrationResult> {
  const payload = await getPayload({ config: await configPromise })

  const student = (
    await payload.find({
      collection: 'students',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
  ).docs[0]

  if (!student) return { ok: false, reason: 'session_expired' }
  if (student.status === 'DISABLED') return { ok: false, reason: 'disabled' }

  const verified = { id: student.id, status: 'ACTIVE' }
  if (student.status === 'ACTIVE') return { ok: true, student: verified }

  const result = await verifyOtp(payload, email, otp)
  if (!result.ok) return result

  await payload.update({
    collection: 'students',
    id: student.id,
    data: { status: 'ACTIVE', verifiedAt: new Date().toISOString() },
  })
  return { ok: true, student: verified }
}
