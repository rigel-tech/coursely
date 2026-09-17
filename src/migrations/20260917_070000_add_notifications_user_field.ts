import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `notifications.user`, a plain FK to `users` mirroring `notifications.student`'s
 * shape — nullable, indexed, `ON DELETE set null` so a deleted staff account does not take
 * its notifications with it.
 */
export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notifications" ADD COLUMN "user_id" integer;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");
  `)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
  DROP INDEX "notifications_user_idx";
  ALTER TABLE "notifications" DROP COLUMN "user_id";
  `)
}
