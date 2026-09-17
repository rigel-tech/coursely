# Research: Enrollment Payments Join

## Decision: `Payments.enrollmentId` changes type in place (`number` → `relationship`), name unchanged

**Rationale**: Sibling fields in the same collection (`studentId`, `userId`) are relationship
fields that keep an `Id`-suffixed name — that is this collection's established convention, not
`Enrollments`' own (`student`, `course`, `class` with no suffix). Keeping the name `enrollmentId`
follows Principle III (change only what was asked) — a rename would touch `defaultColumns`,
`populatePaymentRelations`, every test and seed referencing the field, for no requirement that
asked for it.

**Alternatives considered**: Renaming to `enrollment` to match `Enrollments`' own convention —
rejected, larger diff with no behavioral benefit; `Payments` already mixes both conventions
today (`enrollmentId` vs `studentId`... actually both already carry `Id`), so there is nothing
to reconcile.

## Decision: reverse side uses Payload's `join` field, mirroring `Courses.objectives` / `Courses.phases`

**Rationale**: The codebase already has this exact pattern — `CourseObjectives`/`CoursePhases`
each hold a required `relationship` field named `course`, and `Courses` exposes them back with
`{ type: 'join', collection: 'course-objectives', on: 'course' }`. Payload's `join` field (v3.88,
installed version) supports inline creation via its own "Create new" drawer by default
(`admin.allowCreate`, defaults `true`) — this is exactly the "add payment from the enrollment
page" requirement (FR-004/FR-005) with zero custom UI code, and it reuses the real `Payments`
collection's fields/hooks/access untouched (FR-006).

**Alternatives considered**: A hand-rolled admin component fetching/creating payments via the
REST/Local API — rejected per the user's own stated technical decision and per Principle II
(more code for a problem Payload's join field already solves natively).

## Decision: migration converts the existing `enrollment_id` column in place; no data-loss path needed

**Rationale**: Per the agreed Assumption, every existing `payments.enrollment_id` value already
refers to a real `enrollments.id` — the migration in `20260915_220048_add_payments_collection.ts`
created `payments` after `enrollments` already existed, and no orphan-producing path (e.g. bulk
delete of enrollments) exists in the codebase today. A plain type/column change with a same-values
backfill is therefore correct and sufficient; no reconciliation or default-value logic is needed.

**Column naming detail**: Payload's Postgres adapter derives relationship columns as
`<snake_case(fieldName)>_id` — visible in the existing migration as `studentId` → `student_id_id`.
Renaming `enrollmentId`'s type to `relationship` therefore produces a _new_ column,
`enrollment_id_id`, distinct from the existing plain `enrollment_id` numeric column. The migration
must: add `enrollment_id_id integer NOT NULL` (constrained `REFERENCES enrollments(id)`), backfill
it from the existing `enrollment_id` cast to integer, drop the old `enrollment_id` column and its
now-obsolete type, and add the matching index (mirroring `payments_student_id_idx`).

**Alternatives considered**: Keeping the column named `enrollment_id` by not going through
Payload's normal relationship-column naming — rejected; fighting the ORM's naming convention for
a single field is exactly the kind of hidden trap `INVARIANTS.md` exists to prevent, and every
other relationship column in this table already follows the `<field>_id` pattern.

## Decision: extend `populatePaymentRelations` to also resolve `enrollmentId`

**Rationale**: `INVARIANTS.md` already documents "the admin list view always reads relationship
fields at `depth: 0`" as the exact reason `populatePaymentRelations` exists for `studentId`/
`userId` today. Once `enrollmentId` becomes a relationship, the same trap applies to it: left
unhandled, the Payments list's `enrollmentId` column would show an unresolved value instead of a
readable one. This is an in-scope consequence of the type change, not new scope — the hook and
the pattern already exist for the identical problem on the identical collection.

**Alternatives considered**: A dedicated `EnrollmentCell` component, mirroring `StudentCell`/
`RecorderCell` — deferred; `populatePaymentRelations` populating the field is what the two
existing fields already do, and no bespoke display transform (like the name-over-email in
`StudentCell`) is needed for `enrollmentId` today, since `Enrollments.useAsTitle` is `student`
(itself a relationship) — showing the raw populated enrollment object's default admin summary
is acceptable and requires no extra component. Documented here so it does not get silently
skipped during implementation.

## Decision: no changes to `Enrollments` access control or `Payments` access control

**Rationale**: Both collections already gate every operation through `authenticated` (staff-only,
per `src/access/authenticated.ts`). The join field surfaces `Payments` documents inside the
`Enrollments` edit view but every read/create still runs through `Payments`' own access control
— Payload's join field does not bypass the target collection's access rules. FR-006's "same
access" requirement is therefore already satisfied with no code change.
