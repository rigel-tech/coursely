import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * An enrollment now carries at most one payment (FR-030) — replaces the plain
 * `payments_enrollment_id_idx` with a unique index on the same column, mirroring how
 * `enrollments_active_student_course_idx` enforces its own uniqueness at the database level
 * rather than only in application code.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "payments_enrollment_id_idx";
    CREATE UNIQUE INDEX "payments_enrollment_id_unique_idx"
      ON "payments" USING btree ("enrollment_id_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "payments_enrollment_id_unique_idx";
    CREATE INDEX "payments_enrollment_id_idx"
      ON "payments" USING btree ("enrollment_id_id");
  `)
}
