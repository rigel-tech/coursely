import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_students_status" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED');
  CREATE TYPE "public"."enum_pages_blocks_content_columns_card_style" AS ENUM('none', 'card', 'muted', 'primary', 'dark');
  CREATE TYPE "public"."enum_pages_blocks_content_columns_text_color" AS ENUM('default', 'white', 'primary', 'muted');
  CREATE TYPE "public"."enum_pages_blocks_content_background" AS ENUM('none', 'muted', 'card', 'primary', 'dark');
  CREATE TYPE "public"."enum__pages_v_blocks_content_columns_card_style" AS ENUM('none', 'card', 'muted', 'primary', 'dark');
  CREATE TYPE "public"."enum__pages_v_blocks_content_columns_text_color" AS ENUM('default', 'white', 'primary', 'muted');
  CREATE TYPE "public"."enum__pages_v_blocks_content_background" AS ENUM('none', 'muted', 'card', 'primary', 'dark');
  CREATE TABLE "students" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar,
  	"phone" varchar,
  	"avatar_id" integer,
  	"status" "enum_students_status" DEFAULT 'ACTIVE' NOT NULL,
  	"verified_at" timestamp(3) with time zone,
  	"last_login_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "pages_blocks_consultation_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_consultation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"badge" varchar,
  	"title" varchar,
  	"description" varchar,
  	"note" varchar,
  	"form_id" integer,
  	"hotline" varchar,
  	"block_name" varchar
  );
  
  
  CREATE TABLE "_pages_v_blocks_consultation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"badge" varchar,
  	"title" varchar,
  	"description" varchar,
  	"note" varchar,
  	"form_id" integer,
  	"hotline" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "audit_logs" CASCADE;
  ALTER TABLE "users" DROP CONSTRAINT "users_avatar_id_media_id_fk";
  
  ALTER TABLE "users" DROP CONSTRAINT "users_created_by_id_users_id_fk";
  
  ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_logs_fk";
  
  DROP INDEX "users_avatar_idx";
  DROP INDEX "users_created_by_idx";
  DROP INDEX "notifications_user_idx";
  DROP INDEX "payload_locked_documents_rels_audit_logs_id_idx";
  ALTER TABLE "site_settings" ALTER COLUMN "site_name" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "tagline" DROP DEFAULT;
  ALTER TABLE "pages_blocks_content_columns" ADD COLUMN "card_style" "enum_pages_blocks_content_columns_card_style" DEFAULT 'none';
  ALTER TABLE "pages_blocks_content_columns" ADD COLUMN "text_color" "enum_pages_blocks_content_columns_text_color" DEFAULT 'default';
  ALTER TABLE "pages_blocks_content" ADD COLUMN "background" "enum_pages_blocks_content_background" DEFAULT 'none';
  ALTER TABLE "_pages_v_blocks_content_columns" ADD COLUMN "card_style" "enum__pages_v_blocks_content_columns_card_style" DEFAULT 'none';
  ALTER TABLE "_pages_v_blocks_content_columns" ADD COLUMN "text_color" "enum__pages_v_blocks_content_columns_text_color" DEFAULT 'default';
  ALTER TABLE "_pages_v_blocks_content" ADD COLUMN "background" "enum__pages_v_blocks_content_background" DEFAULT 'none';
  ALTER TABLE "notifications" ADD COLUMN "student_id" integer NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "students_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "students_id" integer;
  ALTER TABLE "students" ADD CONSTRAINT "students_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "students" ADD CONSTRAINT "students_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_consultation_steps" ADD CONSTRAINT "pages_blocks_consultation_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_consultation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_consultation" ADD CONSTRAINT "pages_blocks_consultation_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_consultation" ADD CONSTRAINT "pages_blocks_consultation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_consultation_steps" ADD CONSTRAINT "_pages_v_blocks_consultation_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_consultation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_consultation" ADD CONSTRAINT "_pages_v_blocks_consultation_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_consultation" ADD CONSTRAINT "_pages_v_blocks_consultation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "students_avatar_idx" ON "students" USING btree ("avatar_id");
  CREATE INDEX "students_created_by_idx" ON "students" USING btree ("created_by_id");
  CREATE INDEX "students_updated_at_idx" ON "students" USING btree ("updated_at");
  CREATE INDEX "students_created_at_idx" ON "students" USING btree ("created_at");
  CREATE UNIQUE INDEX "students_email_idx" ON "students" USING btree ("email");
  CREATE INDEX "pages_blocks_consultation_steps_order_idx" ON "pages_blocks_consultation_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_consultation_steps_parent_id_idx" ON "pages_blocks_consultation_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_consultation_order_idx" ON "pages_blocks_consultation" USING btree ("_order");
  CREATE INDEX "pages_blocks_consultation_parent_id_idx" ON "pages_blocks_consultation" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_consultation_path_idx" ON "pages_blocks_consultation" USING btree ("_path");
  CREATE INDEX "pages_blocks_consultation_form_idx" ON "pages_blocks_consultation" USING btree ("form_id");
  CREATE INDEX "_pages_v_blocks_consultation_steps_order_idx" ON "_pages_v_blocks_consultation_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_consultation_steps_parent_id_idx" ON "_pages_v_blocks_consultation_steps" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_consultation_order_idx" ON "_pages_v_blocks_consultation" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_consultation_parent_id_idx" ON "_pages_v_blocks_consultation" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_consultation_path_idx" ON "_pages_v_blocks_consultation" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_consultation_form_idx" ON "_pages_v_blocks_consultation" USING btree ("form_id");
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_students_fk" FOREIGN KEY ("students_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_students_fk" FOREIGN KEY ("students_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "notifications_student_idx" ON "notifications" USING btree ("student_id");
  CREATE INDEX "payload_locked_documents_rels_students_id_idx" ON "payload_locked_documents_rels" USING btree ("students_id");
  CREATE INDEX "payload_preferences_rels_students_id_idx" ON "payload_preferences_rels" USING btree ("students_id");
  ALTER TABLE "users" DROP COLUMN "phone";
  ALTER TABLE "users" DROP COLUMN "avatar_id";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "users" DROP COLUMN "status";
  ALTER TABLE "users" DROP COLUMN "is_walk_in";
  ALTER TABLE "users" DROP COLUMN "verified_at";
  ALTER TABLE "users" DROP COLUMN "last_login_at";
  ALTER TABLE "users" DROP COLUMN "created_by_id";
  ALTER TABLE "notifications" DROP COLUMN "user_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_logs_id";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_status";
  DROP TYPE "public"."enum_audit_logs_action";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('ADMIN', 'STUDENT');
  CREATE TYPE "public"."enum_users_status" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('LOGIN_SUCCESS', 'LOGOUT', 'LOGOUT_ALL', 'REFRESH_REUSE');
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" "enum_audit_logs_action" NOT NULL,
  	"user_id" integer,
  	"ip" varchar NOT NULL,
  	"user_agent" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "students" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_consultation_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_consultation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_consultation_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_consultation" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "students" CASCADE;
  DROP TABLE "pages_blocks_consultation_steps" CASCADE;
  DROP TABLE "pages_blocks_consultation" CASCADE;
  DROP TABLE "_pages_v_blocks_consultation_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_consultation" CASCADE;
  ALTER TABLE "notifications" DROP CONSTRAINT "notifications_student_id_students_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_students_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_students_fk";
  
  DROP INDEX "notifications_student_idx";
  DROP INDEX "payload_locked_documents_rels_students_id_idx";
  DROP INDEX "payload_preferences_rels_students_id_idx";
  ALTER TABLE "site_settings" ALTER COLUMN "site_name" SET DEFAULT 'SPEAKEDGE';
  ALTER TABLE "site_settings" ALTER COLUMN "tagline" SET DEFAULT 'Anh ngữ công sở';
  ALTER TABLE "users" ADD COLUMN "phone" varchar;
  ALTER TABLE "users" ADD COLUMN "avatar_id" integer;
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'STUDENT' NOT NULL;
  ALTER TABLE "users" ADD COLUMN "status" "enum_users_status" DEFAULT 'PENDING_VERIFICATION' NOT NULL;
  ALTER TABLE "users" ADD COLUMN "is_walk_in" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "verified_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "notifications" ADD COLUMN "user_id" integer NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_logs_id" integer;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "users_created_by_idx" ON "users" USING btree ("created_by_id");
  CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  ALTER TABLE "pages_blocks_content_columns" DROP COLUMN "card_style";
  ALTER TABLE "pages_blocks_content_columns" DROP COLUMN "text_color";
  ALTER TABLE "pages_blocks_content" DROP COLUMN "background";
  ALTER TABLE "_pages_v_blocks_content_columns" DROP COLUMN "card_style";
  ALTER TABLE "_pages_v_blocks_content_columns" DROP COLUMN "text_color";
  ALTER TABLE "_pages_v_blocks_content" DROP COLUMN "background";
  ALTER TABLE "notifications" DROP COLUMN "student_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "students_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "students_id";
  DROP TYPE "public"."enum_students_status";
  DROP TYPE "public"."enum_pages_blocks_content_columns_card_style";
  DROP TYPE "public"."enum_pages_blocks_content_columns_text_color";
  DROP TYPE "public"."enum_pages_blocks_content_background";
  DROP TYPE "public"."enum__pages_v_blocks_content_columns_card_style";
  DROP TYPE "public"."enum__pages_v_blocks_content_columns_text_color";
  DROP TYPE "public"."enum__pages_v_blocks_content_background";`)
}
