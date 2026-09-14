import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * E-04 — split students out of `users` into their own auth collection, and drop
 * `audit-logs`.
 *
 * Written by hand rather than by `payload migrate:create`: that command asks
 * interactive create-or-rename questions for every new enum and table, and there
 * is no non-interactive answer for them. The DDL below was taken from a database
 * the dev schema push had already produced, so it matches what Payload generates.
 *
 * Three things here are load-bearing:
 *
 * **Ids are carried over.** `students` rows keep the `users.id` they had, and the
 * sequence is advanced past them. That is what lets `notifications.user_id` be
 * re-pointed by swapping one foreign key instead of rewriting every row, and it
 * means no notification can end up attached to the wrong account. From this point
 * on the two tables have independent sequences and their ids will collide — see
 * INVARIANTS.
 *
 * **`hash` and `salt` move untouched.** Nothing re-hashes; existing students sign
 * in with the password they already had.
 *
 * **`audit_logs` is dropped, not migrated.** Its rows are discarded. `down`
 * recreates the table empty — the history does not come back.
 */
export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_students_status" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED');

  CREATE TABLE "students" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar,
  	"phone" varchar,
  	"avatar_id" integer,
  	"status" "enum_students_status" DEFAULT 'PENDING_VERIFICATION' NOT NULL,
  	"is_walk_in" boolean DEFAULT false,
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

  ALTER TABLE "students" ADD CONSTRAINT "students_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "students" ADD CONSTRAINT "students_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "students_avatar_idx" ON "students" USING btree ("avatar_id");
  CREATE INDEX "students_created_by_idx" ON "students" USING btree ("created_by_id");
  CREATE INDEX "students_updated_at_idx" ON "students" USING btree ("updated_at");
  CREATE INDEX "students_created_at_idx" ON "students" USING btree ("created_at");
  CREATE UNIQUE INDEX "students_email_idx" ON "students" USING btree ("email");

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "students_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_students_fk" FOREIGN KEY ("students_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_students_id_idx" ON "payload_locked_documents_rels" USING btree ("students_id");

  -- Move the accounts, ids and credentials intact.
  INSERT INTO "students" (
    "id", "full_name", "phone", "avatar_id", "status", "is_walk_in", "verified_at",
    "last_login_at", "created_by_id", "updated_at", "created_at", "email",
    "reset_password_token", "reset_password_expiration", "salt", "hash",
    "login_attempts", "lock_until"
  )
  SELECT
    "id", "full_name", "phone", "avatar_id", "status"::text::"enum_students_status", "is_walk_in",
    "verified_at", "last_login_at", "created_by_id", "updated_at", "created_at", "email",
    "reset_password_token", "reset_password_expiration", "salt", "hash",
    "login_attempts", "lock_until"
  FROM "users" WHERE "role" = 'STUDENT';

  -- The copied ids came from users' sequence; move students' past them so the next
  -- insert does not collide with a row we just wrote.
  SELECT setval('students_id_seq', COALESCE((SELECT MAX("id") FROM "students"), 0) + 1, false);

  -- Same ids on both sides, so re-pointing is a constraint swap, not a data rewrite.
  ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_users_id_fk";
  DELETE FROM "notifications" WHERE "user_id" IS NOT NULL
    AND "user_id" NOT IN (SELECT "id" FROM "students");
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_students_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;

  -- audit-logs is removed from the application entirely; its rows are not kept.
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "audit_logs_id";
  DROP TABLE IF EXISTS "audit_logs" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_audit_logs_action";

  -- Only staff remain in users, and only the fields staff need.
  DELETE FROM "users" WHERE "role" = 'STUDENT';
  ALTER TABLE "users" DROP COLUMN "phone";
  ALTER TABLE "users" DROP COLUMN "avatar_id";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "users" DROP COLUMN "status";
  ALTER TABLE "users" DROP COLUMN "is_walk_in";
  ALTER TABLE "users" DROP COLUMN "verified_at";
  ALTER TABLE "users" DROP COLUMN "last_login_at";
  ALTER TABLE "users" DROP COLUMN "created_by_id";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_status";`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_users_role" AS ENUM('ADMIN', 'STUDENT');
  CREATE TYPE "public"."enum_users_status" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('LOGIN_SUCCESS', 'LOGOUT', 'LOGOUT_ALL', 'REFRESH_REUSE');

  ALTER TABLE "users" ADD COLUMN "phone" varchar;
  ALTER TABLE "users" ADD COLUMN "avatar_id" integer;
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'STUDENT' NOT NULL;
  ALTER TABLE "users" ADD COLUMN "status" "enum_users_status" DEFAULT 'PENDING_VERIFICATION' NOT NULL;
  ALTER TABLE "users" ADD COLUMN "is_walk_in" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "verified_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX IF NOT EXISTS "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX IF NOT EXISTS "users_created_by_idx" ON "users" USING btree ("created_by_id");

  -- Staff rows already there keep role ADMIN; everything coming back is a student.
  UPDATE "users" SET "role" = 'ADMIN', "status" = 'ACTIVE';

  INSERT INTO "users" (
    "id", "full_name", "phone", "avatar_id", "role", "status", "is_walk_in", "verified_at",
    "last_login_at", "created_by_id", "updated_at", "created_at", "email",
    "reset_password_token", "reset_password_expiration", "salt", "hash",
    "login_attempts", "lock_until"
  )
  SELECT
    "id", "full_name", "phone", "avatar_id", 'STUDENT', "status"::text::"enum_users_status",
    "is_walk_in", "verified_at", "last_login_at", "created_by_id", "updated_at", "created_at",
    "email", "reset_password_token", "reset_password_expiration", "salt", "hash",
    "login_attempts", "lock_until"
  FROM "students";

  SELECT setval('users_id_seq', COALESCE((SELECT MAX("id") FROM "users"), 0) + 1, false);

  ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_students_id_fk";
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" "enum_audit_logs_action" NOT NULL,
  	"user_id" integer,
  	"ip" varchar NOT NULL,
  	"user_agent" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_logs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");

  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "students_id";
  DROP TABLE "students" CASCADE;
  DROP TYPE "public"."enum_students_status";`)
}
