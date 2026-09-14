import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_notifications_type"
      ADD VALUE IF NOT EXISTS 'ENROLLMENT_CREATED';

    CREATE TYPE "public"."enum_enrollments_enrollment_status" AS ENUM(
      'NEW', 'CONFIRMED', 'ATTENDED', 'COMPLETED', 'CANCELLED'
    );
    CREATE TYPE "public"."enum_enrollments_payment_status" AS ENUM(
      'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'
    );
    CREATE TYPE "public"."enum_enrollments_registration_source" AS ENUM(
      'SELF_REGISTRATION', 'ADMIN_CREATED'
    );

    CREATE TABLE "enrollments" (
      "id" serial PRIMARY KEY NOT NULL,
      "student_id" integer NOT NULL,
      "course_id" integer NOT NULL,
      "class_id" integer,
      "enrollment_status" "enum_enrollments_enrollment_status" DEFAULT 'NEW' NOT NULL,
      "payment_status" "enum_enrollments_payment_status" DEFAULT 'UNPAID' NOT NULL,
      "registration_source" "enum_enrollments_registration_source" NOT NULL,
      "registered_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "confirmed_at" timestamp(3) with time zone,
      "class_assigned_at" timestamp(3) with time zone,
      "cancelled_at" timestamp(3) with time zone,
      "created_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "enrollments"
      ADD CONSTRAINT "enrollments_student_id_students_id_fk"
      FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;
    ALTER TABLE "enrollments"
      ADD CONSTRAINT "enrollments_course_id_courses_id_fk"
      FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;
    ALTER TABLE "enrollments"
      ADD CONSTRAINT "enrollments_class_id_classes_id_fk"
      FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "enrollments"
      ADD CONSTRAINT "enrollments_created_by_id_users_id_fk"
      FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_id");
    CREATE INDEX "enrollments_course_idx" ON "enrollments" USING btree ("course_id");
    CREATE INDEX "enrollments_class_idx" ON "enrollments" USING btree ("class_id");
    CREATE INDEX "enrollments_created_by_idx" ON "enrollments" USING btree ("created_by_id");
    CREATE INDEX "enrollments_updated_at_idx" ON "enrollments" USING btree ("updated_at");
    CREATE INDEX "enrollments_created_at_idx" ON "enrollments" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "enrollments_id" integer;
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_enrollments_fk"
      FOREIGN KEY ("enrollments_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_enrollments_id_idx"
      ON "payload_locked_documents_rels" USING btree ("enrollments_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT "payload_locked_documents_rels_enrollments_fk";
    DROP INDEX "payload_locked_documents_rels_enrollments_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "enrollments_id";
    DROP TABLE "enrollments" CASCADE;
    DROP TYPE "public"."enum_enrollments_registration_source";
    DROP TYPE "public"."enum_enrollments_payment_status";
    DROP TYPE "public"."enum_enrollments_enrollment_status";
  `)
}
