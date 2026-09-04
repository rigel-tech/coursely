import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "course_objectives" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"course_id" integer NOT NULL,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "course_phases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" jsonb,
  	"course_id" integer NOT NULL,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "course_objectives_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "course_phases_id" integer;
  ALTER TABLE "course_objectives" ADD CONSTRAINT "course_objectives_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "course_phases" ADD CONSTRAINT "course_phases_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "course_objectives_course_idx" ON "course_objectives" USING btree ("course_id");
  CREATE INDEX "course_objectives_updated_at_idx" ON "course_objectives" USING btree ("updated_at");
  CREATE INDEX "course_objectives_created_at_idx" ON "course_objectives" USING btree ("created_at");
  CREATE INDEX "course_phases_course_idx" ON "course_phases" USING btree ("course_id");
  CREATE INDEX "course_phases_updated_at_idx" ON "course_phases" USING btree ("updated_at");
  CREATE INDEX "course_phases_created_at_idx" ON "course_phases" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_objectives_fk" FOREIGN KEY ("course_objectives_id") REFERENCES "public"."course_objectives"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_course_phases_fk" FOREIGN KEY ("course_phases_id") REFERENCES "public"."course_phases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_course_objectives_id_idx" ON "payload_locked_documents_rels" USING btree ("course_objectives_id");
  CREATE INDEX "payload_locked_documents_rels_course_phases_id_idx" ON "payload_locked_documents_rels" USING btree ("course_phases_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "course_objectives" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "course_phases" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "course_objectives" CASCADE;
  DROP TABLE "course_phases" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_course_objectives_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_course_phases_fk";
  
  DROP INDEX "payload_locked_documents_rels_course_objectives_id_idx";
  DROP INDEX "payload_locked_documents_rels_course_phases_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "course_objectives_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "course_phases_id";`)
}
