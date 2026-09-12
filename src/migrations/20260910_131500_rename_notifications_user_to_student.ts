import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `notifications.user` becomes `notifications.student`. The field always pointed at
 * `students`; only its name changes.
 *
 * Written by hand, and that is the whole point of this file. `payload migrate:create`
 * diffs two schemas and cannot see that a column was renamed rather than replaced, so it
 * emits `DROP COLUMN "user_id"` followed by `ADD COLUMN "student_id"` — valid SQL that
 * runs cleanly and silently discards every notification's owner. `RENAME` keeps the rows,
 * the values and the foreign key intact.
 *
 * The index and the constraint are renamed too. Neither has to be — Postgres does not
 * care what they are called — but Payload derives these names from the field, so leaving
 * them behind means the next generated migration sees a difference that is not there and
 * tries to "fix" it.
 */
export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notifications" RENAME COLUMN "user_id" TO "student_id";
  ALTER TABLE "notifications" RENAME CONSTRAINT "notifications_user_id_students_id_fk" TO "notifications_student_id_students_id_fk";
  ALTER INDEX "notifications_user_idx" RENAME TO "notifications_student_idx";
  `)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notifications" RENAME COLUMN "student_id" TO "user_id";
  ALTER TABLE "notifications" RENAME CONSTRAINT "notifications_student_id_students_id_fk" TO "notifications_user_id_students_id_fk";
  ALTER INDEX "notifications_student_idx" RENAME TO "notifications_user_idx";
  `)
}
