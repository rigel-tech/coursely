import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** A staff-facing (broadcast) notification has no student — see specs/011. */
export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notifications" ALTER COLUMN "student_id" DROP NOT NULL;`)
}

/** Rollback assumes no staff-facing row exists yet — it would violate the restored constraint. */
export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notifications" ALTER COLUMN "student_id" SET NOT NULL;`)
}
