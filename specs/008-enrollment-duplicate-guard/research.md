# Phase 0 Research: Enrollment Duplicate Guard

## Decision 1 — Where the constraint lives: a partial unique index, added via `afterSchemaInit`

**Decision**: A Postgres partial unique index on `enrollments (student_id, course_id) WHERE enrollment_status <> 'CANCELLED'`, added through `postgresAdapter({ afterSchemaInit: [...] })` in `src/payload.config.ts` using `@payloadcms/drizzle`'s `extendTable` helper, then captured in a hand-written migration (matching the style already used in
`src/migrations/20260914_120000_add_enrollments_collection.ts`).

**Rationale**:

- This repo runs two schema paths side by side: `pnpm dev` / `tests/int` use drizzle-kit
  _push_ (schema derived live from the Payload config), while production applies
  `prodMigrations`. A constraint expressed only as hand-written SQL in a migration would be
  invisible to push mode — dev and test would run unguarded. `afterSchemaInit` is read by
  both paths, because both build the same runtime Postgres adapter from
  `payload.config.ts`.
- A **partial** index (`WHERE enrollment_status <> 'CANCELLED'`) is required, not a plain
  unique index on `(student_id, course_id)`: FR-008 (Q1, resolved) requires a CANCELLED
  enrollment not to block re-registration. A plain compound-unique constraint cannot
  express "unique except when this column has value X" — Postgres partial indexes exist
  for exactly this.
- Confirmed via `node_modules/.pnpm/@payloadcms+drizzle@.../dist/postgres/types.d.ts`:
  `afterSchemaInit` hooks receive `{ adapter, extendTable, schema }`, where
  `schema.tables.enrollments` is the already-built Drizzle table and `extendTable` can add
  to its `extraConfig` (index/constraint builders) without redeclaring columns.

**Alternatives considered**:

- _Plain compound unique index, unconditionally._ Rejected — blocks FR-008 outright (a
  cancelled student could never re-enrol).
- _Application-level check only (`payload.find` before `payload.create`, no DB
  constraint)._ Rejected outright by FR-002, which explicitly requires the guard to hold
  under concurrent submissions; a check-then-insert done as two separate steps is racy by
  construction — both requests can see "no existing enrollment" before either writes.
- _A `beforeValidate` hook doing the same check._ Same race as above — a Payload hook
  runs in application code, before the write, and cannot make a check-then-insert atomic
  by itself.
- _A raw `INSERT ... ON CONFLICT ... DO NOTHING` via `payload.db.drizzle` directly,
  bypassing `payload.create` for this one insert._ Would give the most direct read of the
  conflict outcome, but throws away Payload's own hooks/access-control/typed builder for
  this one write and duplicates the field list by hand — more code and more drift risk
  than the codebase's existing patterns for a problem the partial index already solves.
  Rejected on "simple first."

## Decision 2 — Recognising the constraint violation without depending on raw driver errors

**Decision**: Do a `payload.find` pre-check for an existing active enrollment first (fast,
clear path for the overwhelming majority of requests — no race), and treat any
`ValidationError` (imported from `'payload'`) thrown specifically by the
`payload.create({ collection: 'enrollments', ... })` call as the duplicate signal for the
rare genuine race. Both paths throw the same new `EnrollmentAlreadyExists` error (see
Decision 3) with the same student-facing message.

**Rationale**:

- Read `@payloadcms/drizzle`'s `dist/upsertRow/handleUpsertError.js` directly: Payload's
  Postgres adapter already intercepts a raw Postgres `23505` (unique_violation) inside
  `payload.create`/upsert and converts it to a Payload `ValidationError` **before** it
  ever reaches application code — the original `pg` error (with its `.code` and
  `.constraint` name) is not preserved on what gets thrown. Catching for `error.code ===
'23505'` in the service, as one might expect from raw `pg`, would never fire here; it
  would silently never match, and the duplicate would surface as an unrelated failure.
- `ValidationError.errors[0].path` is Payload's best-effort field name, resolved from
  `adapter.fieldConstraints` (populated only for Payload-level `unique: true` fields — our
  index isn't one) or, failing that, a regex over the driver's `detail` string (`"Key
(student_id, course_id)=(7, 12) already exists."`). For a composite key this yields the
  literal string `"student_id, course_id"` — usable, but a string this specific is a poor
  long-term identifier: it depends on column _order_ in the index definition and on
  Postgres's own detail-message format, neither of which this feature controls.
- Given that, the catch is narrowed twice, not by string-matching `path`: (a) it wraps
  only the single `payload.create` call for the `enrollments` collection, never the whole
  transaction (so a `ValidationError` from the sibling `notifications` insert, or a future
  validation error unrelated to this guard, is never mistaken for a duplicate), and (b) it
  is documented as a load-bearing coupling for whoever next adds a field to `Enrollments`
  — see the INVARIANTS.md candidate flagged in `plan.md`.

**Alternatives considered**:

- _Catch on `error.errors?.[0]?.path`._ Considered as a second check to distinguish this
  constraint from some hypothetical future `unique: true` field on `Enrollments`, but
  rejected as the primary signal — see above. Not used at all: the collection has no other
  unique field today, and pattern-matching a derived string is worse than the tight-scope
  catch, not better.
- _Skip the pre-check, rely solely on the constraint._ Rejected on UX and on FR-006 (no
  raw storage-layer error reaching the student) — routing every duplicate through Payload's
  generic `ValidationError` path (English "Value must be unique", not this feature's
  Vietnamese copy) for what is, in practice, almost never a real race is unnecessary
  indirection for the common case. The pre-check makes the fast path direct; the
  constraint is the correctness backstop for the race the pre-check cannot close.

## Decision 3 — Error shape: extend the established `APIError` subclass pattern

**Decision**: `EnrollmentAlreadyExists extends APIError` in a new
`src/lib/errors/enrollment.ts`, constructed with the fixed message "Bạn đã đăng ký khóa
học này rồi." `createEnrollmentAction` gains a `try/catch` (it currently has none) that
maps this one class to its message and rethrows anything else — mirroring
`loginAction`'s existing `instanceof` chain against `src/lib/errors/auth.ts`.

**Rationale**: matches the one error-class-per-refusal convention already established
(`LoginRefused`, `EmailNotVerified`) and its stated reason for living apart from the
service (`src/lib/errors/auth.ts`'s own module banner) — a unit test mocking
`@/services/student-enrollment` keeps the class import lightweight, without pulling in
Payload config.

**Note on a pre-existing gap this plan depends on closing**: `createEnrollmentAction`
today has no `try/catch` around `createStudentEnrollment` at all — a course-window refusal
(`validateCourseForEnrollment` throwing a plain `Error`) already propagates uncaught out of
the server action. `CourseRegistrationForm`'s client-side `.catch()` still shows _a_
message (the generic fallback), so nothing crashes, but 007's FR-008 ("each refusal reaches
the student as its own message") is not actually satisfied for those cases yet — they all
collapse into the same generic text today. This feature's own FR-003 needs the action to
distinguish its refusal from that generic fallback, so the `try/catch` this plan adds
is the minimum needed for 008; it does not attempt the fuller job of giving every
`validateCourseForEnrollment` message its own typed error (that remains 007's unfinished
User Story 2, out of scope here).

## Decision 4 — Migration authoring

**Decision**: Hand-write the migration SQL (in the same style as
`20260914_120000_add_enrollments_collection.ts`) rather than running `payload
migrate:create` to autogenerate it, because the local dev database already has the schema
applied via push and running the generator against it would diff against an already-current
database and produce an empty or misleading migration.

**Rationale**: consistent with how the sibling migration in this feature area was authored;
keeps production's applied history in an explicit, reviewable SQL statement:
`CREATE UNIQUE INDEX "enrollments_active_student_course_idx" ON "enrollments" ("student_id", "course_id") WHERE "enrollment_status" <> 'CANCELLED';`
