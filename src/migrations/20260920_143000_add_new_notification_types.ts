import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds new enum values to `enum_notifications_type` for class lifecycle,
 * enrollment status changes, and payment recorded events.
 * `down()` cannot undo `ADD VALUE` — Postgres has no `DROP VALUE` for enums.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    COMMIT;
    ALTER TYPE "public"."enum_notifications_type"
      ADD VALUE IF NOT EXISTS 'ENROLLMENT_CONFIRMED';
    ALTER TYPE "public"."enum_notifications_type"
      ADD VALUE IF NOT EXISTS 'CLASS_ASSIGNED';
    ALTER TYPE "public"."enum_notifications_type"
      ADD VALUE IF NOT EXISTS 'PAYMENT_RECORDED';
    ALTER TYPE "public"."enum_notifications_type"
      ADD VALUE IF NOT EXISTS 'CLASS_RESCHEDULED';
    ALTER TYPE "public"."enum_notifications_type"
      ADD VALUE IF NOT EXISTS 'CLASS_CANCELLED';
    BEGIN;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
