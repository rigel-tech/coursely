import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX "enrollments_active_student_course_idx"
      ON "enrollments" USING btree ("student_id", "course_id")
      WHERE "enrollment_status" <> 'CANCELLED';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "enrollments_active_student_course_idx";
  `)
}
