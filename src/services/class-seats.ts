/**
 * Seat accounting for a class, in the one place both writers share: the per-document guard
 * (`guardClassCapacity`) and the batch assignment service (`class-assignment.ts`).
 *
 * Counting seats and then writing is a read-then-write: two admins filling the same class at
 * the same time would both read "one seat left" and both take it, and nothing would say so.
 * `lockClassSeats` closes that by taking a Postgres advisory lock keyed to the class before
 * the count. The lock is transaction-scoped (`pg_advisory_xact_lock`), so it releases itself
 * on commit or rollback — there is no unlock to forget — and it only serialises writers
 * touching the *same* class.
 *
 * It is deliberately a lock on a number, not on the `classes` row: editing the class document
 * itself must not queue behind a roomful of seat checks.
 */
import type { PayloadRequest } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Advisory locks share one global namespace, so the first key names *what* is being locked
 * and the second names *which one* — any other advisory lock in this codebase must pick a
 * different first key.
 */
const CLASS_SEATS_LOCK_NAMESPACE = 5013

/**
 * Serialises seat checks for one class until the current transaction ends.
 *
 * Without a transaction the lock would be released the instant it is taken, which would leave
 * the count unprotected while still looking guarded — so this refuses to pretend, and simply
 * does nothing when there is no transaction to scope the lock to. Every write path Payload
 * runs (`updateByID`, `update`, `create`) opens one before hooks run; only an explicit
 * `disableTransaction: true` opts out.
 */
export const lockClassSeats = async ({
  classId,
  req,
}: {
  classId: number
  req: PayloadRequest
}): Promise<void> => {
  if (!req.transactionID) return

  // `payload.db` is typed as the database-agnostic adapter, which knows nothing about
  // transaction sessions. Narrowing to the one property this needs — taken from the real
  // Postgres adapter type, not hand-written — keeps that dependency explicit.
  const { sessions } = req.payload.db as unknown as Pick<PostgresAdapter, 'sessions'>
  const session = sessions?.[String(req.transactionID)]

  if (!session) return

  await session.db.execute(
    sql`SELECT pg_advisory_xact_lock(${CLASS_SEATS_LOCK_NAMESPACE}, ${classId})`,
  )
}

export const countClassOccupancy = async ({
  classId,
  req,
}: {
  classId: number
  req: PayloadRequest
}): Promise<number> => {
  const { totalDocs } = await req.payload.count({
    collection: 'enrollments',
    where: {
      and: [{ class: { equals: classId } }, { enrollmentStatus: { not_equals: 'CANCELLED' } }],
    },
    overrideAccess: true,
    req,
  })

  return totalDocs
}
