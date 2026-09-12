import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/** Remove the retired walk-in flag from the students collection. */
export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "students" DROP COLUMN IF EXISTS "is_walk_in";`)
}

/** Restore the retired column for a migration rollback; existing values cannot be recovered. */
export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "is_walk_in" boolean DEFAULT false;`)
}
