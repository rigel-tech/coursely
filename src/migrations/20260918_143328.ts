import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_enrollments_enrollment_status" AS ENUM('NEW', 'CONFIRMED', 'ATTENDED', 'COMPLETED', 'CANCELLED');
  CREATE TYPE "public"."enum_enrollments_payment_status" AS ENUM('UNPAID', 'PAID');
  CREATE TYPE "public"."enum_enrollments_registration_source" AS ENUM('SELF_REGISTRATION', 'ADMIN_CREATED');
  CREATE TYPE "public"."enum_payments_payment_method" AS ENUM('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE 'ENROLLMENT_CREATED';
  ALTER TYPE "public"."enum_notifications_type" ADD VALUE 'ENROLLMENT_CANCELLED';
  CREATE TABLE "enrollments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"student_id" integer NOT NULL,
  	"course_id" integer NOT NULL,
  	"class_id" integer,
  	"enrollment_status" "enum_enrollments_enrollment_status" DEFAULT 'NEW' NOT NULL,
  	"payment_status" "enum_enrollments_payment_status" DEFAULT 'UNPAID' NOT NULL,
  	"registration_source" "enum_enrollments_registration_source" DEFAULT 'ADMIN_CREATED' NOT NULL,
  	"registered_at" timestamp(3) with time zone NOT NULL,
  	"confirmed_at" timestamp(3) with time zone,
  	"class_assigned_at" timestamp(3) with time zone,
  	"cancelled_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enrollment_id_id" integer NOT NULL,
  	"student_id_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"payment_method" "enum_payments_payment_method" NOT NULL,
  	"payment_date" timestamp(3) with time zone NOT NULL,
  	"user_id_id" integer,
  	"reference_note" varchar,
  	"proof_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "notifications" ALTER COLUMN "student_id" DROP NOT NULL;
  ALTER TABLE "notifications" ADD COLUMN "user_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "enrollments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_id_students_id_fk" FOREIGN KEY ("student_id_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_id_users_id_fk" FOREIGN KEY ("user_id_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_image_id_media_id_fk" FOREIGN KEY ("proof_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_id");
  CREATE INDEX "enrollments_course_idx" ON "enrollments" USING btree ("course_id");
  CREATE INDEX "enrollments_class_idx" ON "enrollments" USING btree ("class_id");
  CREATE INDEX "enrollments_created_by_idx" ON "enrollments" USING btree ("created_by_id");
  CREATE INDEX "enrollments_updated_at_idx" ON "enrollments" USING btree ("updated_at");
  CREATE INDEX "enrollments_created_at_idx" ON "enrollments" USING btree ("created_at");
  CREATE UNIQUE INDEX "enrollments_active_student_course_idx" ON "enrollments" USING btree ("student_id","course_id") WHERE "enrollments"."enrollment_status" <> 'CANCELLED';
  CREATE INDEX "payments_enrollment_id_idx" ON "payments" USING btree ("enrollment_id_id");
  CREATE INDEX "payments_student_id_idx" ON "payments" USING btree ("student_id_id");
  CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id_id");
  CREATE INDEX "payments_proof_image_idx" ON "payments" USING btree ("proof_image_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE UNIQUE INDEX "payments_enrollment_id_unique_idx" ON "payments" USING btree ("enrollment_id_id");
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enrollments_fk" FOREIGN KEY ("enrollments_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");
  CREATE INDEX "payload_locked_documents_rels_enrollments_id_idx" ON "payload_locked_documents_rels" USING btree ("enrollments_id");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "enrollments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "enrollments" CASCADE;
  DROP TABLE "payments" CASCADE;
  ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_enrollments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_type";
  CREATE TYPE "public"."enum_notifications_type" AS ENUM('ACCOUNT_CREATED');
  ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."enum_notifications_type" USING "type"::"public"."enum_notifications_type";
  DROP INDEX "notifications_user_idx";
  DROP INDEX "payload_locked_documents_rels_enrollments_id_idx";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  ALTER TABLE "notifications" ALTER COLUMN "student_id" SET NOT NULL;
  ALTER TABLE "notifications" DROP COLUMN "user_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "enrollments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  DROP TYPE "public"."enum_enrollments_enrollment_status";
  DROP TYPE "public"."enum_enrollments_payment_status";
  DROP TYPE "public"."enum_enrollments_registration_source";
  DROP TYPE "public"."enum_payments_payment_method";`)
}
