/**
 * Thin wrappers over `payload.sendEmail` for the registration flow. The caller
 * fires these after the DB transaction commits (§5.1 step 7) — never before, or a
 * rolled-back registration would still have emailed a code for a user that does
 * not exist.
 */
import type { Payload } from 'payload'

import { duplicateRegisterAttemptEmail } from '@/email/templates/duplicate-register-attempt'
import { enrollmentCreatedEmail } from '@/email/templates/enrollment-created'
import { verifyOtpEmail } from '@/email/templates/verify-otp'
import { resetPasswordEmail } from '@/email/templates/reset-password'

export async function sendVerifyOtpEmail(payload: Payload, to: string, otp: string): Promise<void> {
  const { subject, html, text } = verifyOtpEmail(otp)
  await payload.sendEmail({ to, subject, html, text })
}

export async function sendDuplicateAttemptEmail(payload: Payload, to: string): Promise<void> {
  const { subject, html, text } = duplicateRegisterAttemptEmail()
  await payload.sendEmail({ to, subject, html, text })
}

export async function sendResetPasswordEmail(
  payload: Payload,
  to: string,
  resetUrl: string,
): Promise<void> {
  const { subject, html, text } = resetPasswordEmail(resetUrl)
  await payload.sendEmail({ to, subject, html, text })
}

export async function sendEnrollmentConfirmationEmail(
  payload: Payload,
  { to, courseTitle }: { to: string; courseTitle: string },
): Promise<void> {
  const { subject, html, text } = enrollmentCreatedEmail(courseTitle)
  await payload.sendEmail({ to, subject, html, text })
}
