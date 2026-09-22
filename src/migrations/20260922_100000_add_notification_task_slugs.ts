import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Registers the three notification tasks (`src/notifications/jobs.ts`) in both enums that
 * key a job to its task — `payload_jobs.task_slug` and `payload_jobs_log.task_slug`.
 * `down()` cannot undo `ADD VALUE` — Postgres has no `DROP VALUE` for enums.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    COMMIT;
    ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'notifyEnrollmentEvent';
    ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'notifyClassEvent';
    ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'notifyPaymentRecorded';
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'notifyEnrollmentEvent';
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'notifyClassEvent';
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'notifyPaymentRecorded';
    BEGIN;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
