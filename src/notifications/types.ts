/**
 * Shared type definitions for notifications and email dispatchers. Every document-backed
 * field is picked from `payload-types.ts` rather than restated, so a schema change reaches
 * the copy that renders it — a widened copy (`paymentMethod: string`) would hide a new
 * payment method from every label lookup.
 */
import type { Class, Payment } from '@/payload-types'

type StudentRecipient = { studentNameOrEmail: string }
type EmailRecipient = StudentRecipient & { to: string }

export type ClassScheduleInfo = { courseTitle: string; classCode: Class['code'] } & Pick<
  Class,
  'startDate' | 'endDate' | 'scheduleTime' | 'location'
>

type ClassCancelledInfo = Pick<ClassScheduleInfo, 'courseTitle' | 'classCode'>

export type PaymentInfo = { courseTitle: string } & Pick<
  Payment,
  'amount' | 'paymentMethod' | 'paymentDate' | 'referenceNote'
>

// Email template inputs (only need studentNameOrEmail + content details)
export type ClassScheduleTemplateInput = StudentRecipient & ClassScheduleInfo
export type ClassCancelledTemplateInput = StudentRecipient & ClassCancelledInfo
export type PaymentRecordedTemplateInput = StudentRecipient & PaymentInfo

// Email dispatcher inputs (require `to` address + content details)
export type ClassScheduleEmailInput = EmailRecipient & ClassScheduleInfo
export type ClassCancelledEmailInput = EmailRecipient & ClassCancelledInfo
export type PaymentRecordedEmailInput = EmailRecipient & PaymentInfo
export type AdminEnrollmentEmailInput = EmailRecipient & { courseTitle: string }
