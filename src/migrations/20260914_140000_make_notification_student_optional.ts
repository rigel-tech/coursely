import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * A staff-facing (broadcast) notification has no student — see specs/011. `ACCOUNT_CREATED`
 * moved from a per-student welcome message to a staff broadcast in this same change, so
 * every existing `ACCOUNT_CREATED` row is backfilled to match the new model — otherwise a
 * student who registered before this deploy keeps that row in their own bell
 * (`student-notifications.ts` still queries `student = studentId`), showing staff-facing
 * copy, and the row counts toward the admin badge without the admin bell ever being able to
 * mark it read (it only PATCHes rows with no `student`).
 */
export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notifications" ALTER COLUMN "student_id" DROP NOT NULL;
  UPDATE "notifications" SET "student_id" = NULL WHERE "type" = 'ACCOUNT_CREATED' AND "student_id" IS NOT NULL;`)
}

/**
 * Restoring `NOT NULL` fails the instant any row has `student_id IS NULL` — which is true
 * for every `ACCOUNT_CREATED` row from the moment this migration's `up()` ran, and for any
 * new one created since (`accountCreatedNotification` never sets a student). Checked
 * explicitly rather than left to Postgres's own constraint-violation error, which names the
 * column, not the reason.
 */
export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  const { rows } = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM "notifications" WHERE "student_id" IS NULL;`,
  )
  const count = rows[0].count

  if (count > 0) {
    throw new Error(
      `Không thể hoàn tác: ${count} dòng "notifications" đang có student_id = NULL ` +
        `(thông báo dành cho staff). Đặt lại NOT NULL sẽ vi phạm ràng buộc ngay lập tức — ` +
        `phải gán student_id cho các dòng này hoặc xoá chúng trước khi hoàn tác migration này.`,
    )
  }

  await db.execute(sql`
  ALTER TABLE "notifications" ALTER COLUMN "student_id" SET NOT NULL;`)
}
