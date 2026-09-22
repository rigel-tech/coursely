/**
 * The only way a write hands off a notification. Payload runs `afterChange` hooks before it
 * commits, so a hook that sent directly would email about a write that can still roll back
 * (`assignStudentsToClass` updates a whole batch in one transaction). Queuing the job with
 * the triggering operation's `req` inserts the job row inside that same transaction: it
 * commits with the write or disappears with it, and the `notifications` queue's worker
 * (`jobs.autoRun` in `payload.config.ts`) only ever sees what committed.
 */
import type { PayloadRequest, TypedJobs } from 'payload'

/** The queue every notification task runs on — kept apart from `default`, where `schedulePublish` waits. */
export const NOTIFICATIONS_QUEUE = 'notifications'

type NotificationTaskSlug = 'notifyEnrollmentEvent' | 'notifyClassEvent' | 'notifyPaymentRecorded'

// One `{ task, input }` pair per task, so an input can only ever travel with its own task.
type NotificationJob = {
  [TSlug in NotificationTaskSlug]: { task: TSlug; input: TypedJobs['tasks'][TSlug]['input'] }
}[NotificationTaskSlug]

/** Queues a notification task inside the transaction of the operation that raised it. */
export async function queueNotification(req: PayloadRequest, job: NotificationJob): Promise<void> {
  await req.payload.jobs.queue({ ...job, queue: NOTIFICATIONS_QUEUE, req })
}
