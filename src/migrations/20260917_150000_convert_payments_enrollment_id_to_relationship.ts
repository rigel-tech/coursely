import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `ON DELETE set null` on a `NOT NULL` column mirrors the existing
 * `payments_student_id_id_students_id_fk` constraint in this same table (also `NOT NULL` +
 * `set null`) — deleting an enrollment/student that still has payments is out of scope for
 * this migration to newly define; this keeps the same (pre-existing) behavior, not a new one.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" ADD COLUMN "enrollment_id_id" integer;
  UPDATE "payments" SET "enrollment_id_id" = "enrollment_id"::integer;
  ALTER TABLE "payments" ALTER COLUMN "enrollment_id_id" SET NOT NULL;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payments_enrollment_id_idx" ON "payments" USING btree ("enrollment_id_id");
  ALTER TABLE "payments" DROP COLUMN "enrollment_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" ADD COLUMN "enrollment_id" numeric;
  UPDATE "payments" SET "enrollment_id" = "enrollment_id_id"::numeric;
  ALTER TABLE "payments" ALTER COLUMN "enrollment_id" SET NOT NULL;
  ALTER TABLE "payments" DROP CONSTRAINT "payments_enrollment_id_id_enrollments_id_fk";
  DROP INDEX "payments_enrollment_id_idx";
  ALTER TABLE "payments" DROP COLUMN "enrollment_id_id";`)
}
