/**
 * Thin wrappers over `payload.sendEmail` for the registration flow. The caller
 * fires these after the DB transaction commits (§5.1 step 7) — never before, or a
 * rolled-back registration would still have emailed a code for a user that does
 * not exist.
 */
import type { Payload } from 'payload'

import { createAdminEnrollmentCancelledEmailTemplate } from '@/email/templates/admin-enrollment-cancelled'
import { createAdminEnrollmentCreatedEmailTemplate } from '@/email/templates/admin-enrollment-created'
import { createClassAssignedEmailTemplate } from '@/email/templates/class-assigned'
import { createClassCancelledEmailTemplate } from '@/email/templates/class-cancelled'
import { createClassRescheduledEmailTemplate } from '@/email/templates/class-rescheduled'
import { duplicateRegisterAttemptEmail } from '@/email/templates/duplicate-register-attempt'
import { createEnrollmentCancelledEmailTemplate } from '@/email/templates/enrollment-cancelled'
import { createEnrollmentConfirmedEmailTemplate } from '@/email/templates/enrollment-confirmed'
import { createEnrollmentCreatedEmailTemplate } from '@/email/templates/enrollment-created'
import { createPaymentRecordedEmailTemplate } from '@/email/templates/payment-recorded'
import { resetPasswordEmail } from '@/email/templates/reset-password'
import { verifyOtpEmail } from '@/email/templates/verify-otp'
import type {
  AdminEnrollmentEmailInput,
  ClassAssignedEmailInput,
  ClassCancelledEmailInput,
  ClassRescheduledEmailInput,
  PaymentRecordedEmailInput,
} from '@/notifications/types'

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
  const { subject, html, text } = createEnrollmentCreatedEmailTemplate(courseTitle)
  await payload.sendEmail({ to, subject, html, text })
}

export async function sendEnrollmentCancellationEmail(
  payload: Payload,
  { to, courseTitle }: { to: string; courseTitle: string },
): Promise<void> {
  const { subject, html, text } = createEnrollmentCancelledEmailTemplate(courseTitle)
  await payload.sendEmail({ to, subject, html, text })
}

export async function sendEnrollmentConfirmedEmail(
  payload: Payload,
  { to, courseTitle }: { to: string; courseTitle: string },
): Promise<void> {
  const { subject, html, text } = createEnrollmentConfirmedEmailTemplate(courseTitle)
  await payload.sendEmail({ to, subject, html, text })
}

export async function sendAdminEnrollmentCreatedEmail(
  payload: Payload,
  { to, studentNameOrEmail, courseTitle }: AdminEnrollmentEmailInput,
): Promise<void> {
  const { subject, html, text } = createAdminEnrollmentCreatedEmailTemplate(
    studentNameOrEmail,
    courseTitle,
  )
  await payload.sendEmail({ to, subject, html, text })
}

export async function sendAdminEnrollmentCancelledEmail(
  payload: Payload,
  { to, studentNameOrEmail, courseTitle }: AdminEnrollmentEmailInput,
): Promise<void> {
  const { subject, html, text } = createAdminEnrollmentCancelledEmailTemplate(
    studentNameOrEmail,
    courseTitle,
  )
  await payload.sendEmail({ to, subject, html, text })
}

export async function sendClassAssignedEmail(
  payload: Payload,
  input: ClassAssignedEmailInput,
): Promise<void> {
  const { subject, html, text } = createClassAssignedEmailTemplate(input)
  await payload.sendEmail({ to: input.to, subject, html, text })
}

export async function sendPaymentRecordedEmail(
  payload: Payload,
  input: PaymentRecordedEmailInput,
): Promise<void> {
  const { subject, html, text } = createPaymentRecordedEmailTemplate(input)
  await payload.sendEmail({ to: input.to, subject, html, text })
}

export async function sendClassCancelledEmail(
  payload: Payload,
  input: ClassCancelledEmailInput,
): Promise<void> {
  const { subject, html, text } = createClassCancelledEmailTemplate(input)
  await payload.sendEmail({ to: input.to, subject, html, text })
}

export async function sendClassRescheduledEmail(
  payload: Payload,
  input: ClassRescheduledEmailInput,
): Promise<void> {
  const { subject, html, text } = createClassRescheduledEmailTemplate(input)
  await payload.sendEmail({ to: input.to, subject, html, text })
}
