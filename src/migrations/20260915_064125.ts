import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_pages_blocks_content_columns_card_style" AS ENUM('none', 'card', 'muted', 'primary', 'dark');
  CREATE TYPE "public"."enum_pages_blocks_content_columns_text_color" AS ENUM('default', 'white', 'primary', 'muted');
  CREATE TYPE "public"."enum_pages_blocks_content_background" AS ENUM('none', 'muted', 'card', 'primary', 'dark');
  CREATE TYPE "public"."enum__pages_v_blocks_content_columns_card_style" AS ENUM('none', 'card', 'muted', 'primary', 'dark');
  CREATE TYPE "public"."enum__pages_v_blocks_content_columns_text_color" AS ENUM('default', 'white', 'primary', 'muted');
  CREATE TYPE "public"."enum__pages_v_blocks_content_background" AS ENUM('none', 'muted', 'card', 'primary', 'dark');

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

  CREATE TABLE "_pages_v_blocks_consultation_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
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

  ALTER TABLE "site_settings" ALTER COLUMN "site_name" DROP DEFAULT;
  ALTER TABLE "site_settings" ALTER COLUMN "tagline" DROP DEFAULT;

  ALTER TABLE "pages_blocks_content_columns" ADD COLUMN "card_style" "enum_pages_blocks_content_columns_card_style" DEFAULT 'none';
  ALTER TABLE "pages_blocks_content_columns" ADD COLUMN "text_color" "enum_pages_blocks_content_columns_text_color" DEFAULT 'default';
  ALTER TABLE "pages_blocks_content" ADD COLUMN "background" "enum_pages_blocks_content_background" DEFAULT 'none';
  ALTER TABLE "_pages_v_blocks_content_columns" ADD COLUMN "card_style" "enum__pages_v_blocks_content_columns_card_style" DEFAULT 'none';
  ALTER TABLE "_pages_v_blocks_content_columns" ADD COLUMN "text_color" "enum__pages_v_blocks_content_columns_text_color" DEFAULT 'default';
  ALTER TABLE "_pages_v_blocks_content" ADD COLUMN "background" "enum__pages_v_blocks_content_background" DEFAULT 'none';

  ALTER TABLE "pages_blocks_consultation_steps" ADD CONSTRAINT "pages_blocks_consultation_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_consultation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_consultation" ADD CONSTRAINT "pages_blocks_consultation_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_consultation" ADD CONSTRAINT "pages_blocks_consultation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_consultation_steps" ADD CONSTRAINT "_pages_v_blocks_consultation_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_consultation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_consultation" ADD CONSTRAINT "_pages_v_blocks_consultation_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_consultation" ADD CONSTRAINT "_pages_v_blocks_consultation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;

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
  ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "students_id" integer;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_students_fk') THEN
      ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_students_fk" FOREIGN KEY ("students_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_students_id_idx" ON "payload_preferences_rels" USING btree ("students_id");
  `)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT IF EXISTS "payload_preferences_rels_students_fk";
  DROP INDEX IF EXISTS "payload_preferences_rels_students_id_idx";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "students_id";

  ALTER TABLE "pages_blocks_consultation_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_consultation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_consultation_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_consultation" DISABLE ROW LEVEL SECURITY;

  DROP TABLE "pages_blocks_consultation_steps" CASCADE;
  DROP TABLE "pages_blocks_consultation" CASCADE;
  DROP TABLE "_pages_v_blocks_consultation_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_consultation" CASCADE;

  ALTER TABLE "pages_blocks_content_columns" DROP COLUMN "card_style";
  ALTER TABLE "pages_blocks_content_columns" DROP COLUMN "text_color";
  ALTER TABLE "pages_blocks_content" DROP COLUMN "background";
  ALTER TABLE "_pages_v_blocks_content_columns" DROP COLUMN "card_style";
  ALTER TABLE "_pages_v_blocks_content_columns" DROP COLUMN "text_color";
  ALTER TABLE "_pages_v_blocks_content" DROP COLUMN "background";

  DROP TYPE "public"."enum_pages_blocks_content_columns_card_style";
  DROP TYPE "public"."enum_pages_blocks_content_columns_text_color";
  DROP TYPE "public"."enum_pages_blocks_content_background";
  DROP TYPE "public"."enum__pages_v_blocks_content_columns_card_style";
  DROP TYPE "public"."enum__pages_v_blocks_content_columns_text_color";
  DROP TYPE "public"."enum__pages_v_blocks_content_background";
  `)
}
