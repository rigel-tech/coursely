/**
 * The notification tasks the `notifications` queue runs (see `queue.ts` for why nothing
 * sends from a hook). Each handler looks its documents up again when it runs — so it
 * reads what committed, including a `fullName` written just before the enrollment — and
 * every lookup happens before anything is sent: a lookup that throws retries a job that
 * has sent nothing yet, while a send that fails is logged, never thrown (`attempt.ts`).
 */
import type { TaskConfig } from 'payload'

import { runClassNotification } from '@/notifications/class-lifecycle'
import { runEnrollmentNotification } from '@/notifications/enrollment'
import { runPaymentNotification } from '@/notifications/payment-recorded'
import type { Notification } from '@/payload-types'

const ENROLLMENT_EVENTS = [
  'ENROLLMENT_CREATED',
  'ENROLLMENT_CANCELLED',
  'ENROLLMENT_CONFIRMED',
  'CLASS_ASSIGNED',
] as const satisfies readonly Notification['type'][]

const CLASS_EVENTS = [
  'CLASS_ASSIGNED',
  'CLASS_RESCHEDULED',
  'CLASS_CANCELLED',
] as const satisfies readonly Notification['type'][]

const notifyEnrollmentEvent: TaskConfig<'notifyEnrollmentEvent'> = {
  slug: 'notifyEnrollmentEvent',
  retries: 2,
  inputSchema: [
    { name: 'enrollmentId', type: 'number', required: true },
    { name: 'event', type: 'select', options: [...ENROLLMENT_EVENTS], required: true },
    { name: 'notifyStaff', type: 'checkbox', required: true },
  ],
  handler: async ({ input, req }) => {
    await runEnrollmentNotification(req.payload, input)
    return { output: {} }
  },
}

const notifyClassEvent: TaskConfig<'notifyClassEvent'> = {
  slug: 'notifyClassEvent',
  retries: 2,
  inputSchema: [
    { name: 'classId', type: 'number', required: true },
    { name: 'event', type: 'select', options: [...CLASS_EVENTS], required: true },
  ],
  handler: async ({ input, req }) => {
    await runClassNotification(req.payload, input)
    return { output: {} }
  },
}

const notifyPaymentRecorded: TaskConfig<'notifyPaymentRecorded'> = {
  slug: 'notifyPaymentRecorded',
  retries: 2,
  inputSchema: [{ name: 'paymentId', type: 'number', required: true }],
  handler: async ({ input, req }) => {
    await runPaymentNotification(req.payload, input)
    return { output: {} }
  },
}

export const notificationTasks = [notifyEnrollmentEvent, notifyClassEvent, notifyPaymentRecorded]
