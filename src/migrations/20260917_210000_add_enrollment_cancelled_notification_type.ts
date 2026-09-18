import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * `down()` cannot undo the `ADD VALUE` below — Postgres has no `DROP VALUE` for enums, at
 * any version. Same caveat as `20260914_120000_add_enrollments_collection.ts`'s addition of
 * `'ENROLLMENT_CREATED'` to this same enum — this migration is otherwise reversible.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    COMMIT;
    ALTER TYPE "public"."enum_notifications_type"
      ADD VALUE IF NOT EXISTS 'ENROLLMENT_CANCELLED';
    BEGIN;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
