import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `ON DELETE restrict`, not `set null` — `enrollment_id_id` is `NOT NULL`, so deleting an
 * enrollment that still has payments must fail loudly instead of tripping a not-null
 * violation. The app-level guard (`Enrollments/hooks/guardAgainstDeleteWithPayments.ts`)
 * rejects the same delete first, with a message staff can act on; this is the backstop for
 * any path that reaches the database directly.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM "payments"
      WHERE "enrollment_id" <> trunc("enrollment_id")
         OR NOT EXISTS (
           SELECT 1 FROM "enrollments" WHERE "enrollments"."id" = "payments"."enrollment_id"::integer
         )
    ) THEN
      RAISE EXCEPTION 'payments.enrollment_id has rows that are not a whole number or do not match an existing enrollment — fix or remove them before running this migration.';
    END IF;
  END $$;
   ALTER TABLE "payments" ADD COLUMN "enrollment_id_id" integer;
  UPDATE "payments" SET "enrollment_id_id" = "enrollment_id"::integer;
  ALTER TABLE "payments" ALTER COLUMN "enrollment_id_id" SET NOT NULL;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id_id") REFERENCES "public"."enrollments"("id") ON DELETE restrict ON UPDATE no action;
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
