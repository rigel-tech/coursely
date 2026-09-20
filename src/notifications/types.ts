/**
 * Shared type definitions for notifications and email dispatchers.
 */

export interface StudentRecipient {
  studentNameOrEmail: string
}

export interface EmailRecipient extends StudentRecipient {
  to: string
}

export interface ClassScheduleInfo {
  courseTitle: string
  classCode: string
  startDate?: string | Date | null
  endDate?: string | Date | null
  scheduleTime?: string | null
  location?: string | null
}

export function toClassScheduleInfo(
  course: { title: string },
  classDoc: {
    code: string
    startDate?: string | Date | null
    endDate?: string | Date | null
    scheduleTime?: string | null
    location?: string | null
  },
): ClassScheduleInfo {
  return {
    courseTitle: course.title,
    classCode: classDoc.code,
    startDate: classDoc.startDate,
    endDate: classDoc.endDate,
    scheduleTime: classDoc.scheduleTime,
    location: classDoc.location,
  }
}

export interface ClassCancelledInfo {
  courseTitle: string
  classCode: string
}

export interface PaymentInfo {
  courseTitle: string
  amount: number
  paymentMethod: string
  paymentDate?: string | Date | null
  referenceNote?: string | null
}

export interface AdminEnrollmentInfo {
  studentNameOrEmail: string
  courseTitle: string
}

// Email template inputs (only need studentNameOrEmail + content details)
export type ClassAssignedTemplateInput = StudentRecipient & ClassScheduleInfo
export type ClassRescheduledTemplateInput = StudentRecipient & ClassScheduleInfo
export type ClassCancelledTemplateInput = StudentRecipient & ClassCancelledInfo
export type PaymentRecordedTemplateInput = StudentRecipient & PaymentInfo

// Email dispatcher inputs (require `to` address + content details)
export type ClassAssignedEmailInput = EmailRecipient & ClassScheduleInfo
export type ClassRescheduledEmailInput = EmailRecipient & ClassScheduleInfo
export type ClassCancelledEmailInput = EmailRecipient & ClassCancelledInfo
export type PaymentRecordedEmailInput = EmailRecipient & PaymentInfo
export type AdminEnrollmentEmailInput = { to: string } & AdminEnrollmentInfo
