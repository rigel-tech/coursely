import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payments_payment_method" AS ENUM('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enrollment_id" numeric NOT NULL,
  	"student_id_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"payment_method" "enum_payments_payment_method" NOT NULL,
  	"payment_date" timestamp(3) with time zone NOT NULL,
  	"reference_note" varchar,
  	"proof_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"user_id_id" integer
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_id_students_id_fk" FOREIGN KEY ("student_id_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_id_users_id_fk" FOREIGN KEY ("user_id_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_image_id_media_id_fk" FOREIGN KEY ("proof_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payments_student_id_idx" ON "payments" USING btree ("student_id_id");
  CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id_id");
  CREATE INDEX "payments_proof_image_idx" ON "payments" USING btree ("proof_image_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  DROP TABLE "payments" CASCADE;
  DROP TYPE "public"."enum_payments_payment_method";`)
}
