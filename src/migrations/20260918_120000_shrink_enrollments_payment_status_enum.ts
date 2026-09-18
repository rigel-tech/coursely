import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * `paymentStatus` is now binary (FR-032, amended) — a payment of any amount marks an
 * enrollment PAID, no partial/cancelled tracking. Postgres has no `DROP VALUE` for enums, so
 * the type is rebuilt: existing PARTIALLY_PAID rows carry over to PAID (money was received),
 * existing CANCELLED rows carry over to UNPAID (no payment is tracked as "received" for a
 * cancelled/refunded enrollment).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "enrollments" ALTER COLUMN "payment_status" DROP DEFAULT;
    ALTER TYPE "public"."enum_enrollments_payment_status" RENAME TO "enum_enrollments_payment_status_old";
    CREATE TYPE "public"."enum_enrollments_payment_status" AS ENUM('UNPAID', 'PAID');
    ALTER TABLE "enrollments" ALTER COLUMN "payment_status" TYPE "public"."enum_enrollments_payment_status"
      USING (
        CASE "payment_status"::text
          WHEN 'PARTIALLY_PAID' THEN 'PAID'
          WHEN 'CANCELLED' THEN 'UNPAID'
          ELSE "payment_status"::text
        END
      )::"public"."enum_enrollments_payment_status";
    ALTER TABLE "enrollments" ALTER COLUMN "payment_status" SET DEFAULT 'UNPAID';
    DROP TYPE "public"."enum_enrollments_payment_status_old";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "enrollments" ALTER COLUMN "payment_status" DROP DEFAULT;
    ALTER TYPE "public"."enum_enrollments_payment_status" RENAME TO "enum_enrollments_payment_status_new";
    CREATE TYPE "public"."enum_enrollments_payment_status" AS ENUM(
      'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'
    );
    ALTER TABLE "enrollments" ALTER COLUMN "payment_status" TYPE "public"."enum_enrollments_payment_status"
      USING "payment_status"::text::"public"."enum_enrollments_payment_status";
    ALTER TABLE "enrollments" ALTER COLUMN "payment_status" SET DEFAULT 'UNPAID';
    DROP TYPE "public"."enum_enrollments_payment_status_new";
  `)
}
