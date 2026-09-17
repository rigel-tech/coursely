# Research: Student Enrollment

Merged from the two sibling specs that had a Phase 0 (`008-enrollment-duplicate-guard`,
`009-enrollment-profile-completeness`) — `007-enrollment-login-gate` recorded none. Decisions
1–4 are Story 3 (duplicate guard); 5–10 are Story 2 (profile completeness).

## Decision 1 — Where the duplicate-guard constraint lives: a partial unique index, added via `afterSchemaInit`

**Decision**: A Postgres partial unique index on
`enrollments (student_id, course_id) WHERE enrollment_status <> 'CANCELLED'`, added through
`postgresAdapter({ afterSchemaInit: [...] })` in `src/payload.config.ts` using
`@payloadcms/drizzle`'s `extendTable` helper, then captured in a hand-written migration
(matching the style already used in
`src/migrations/20260914_120000_add_enrollments_collection.ts`).

**Rationale**:

- This repo runs two schema paths side by side: `pnpm dev` / `tests/int` use drizzle-kit
  _push_ (schema derived live from the Payload config), while production applies
  `prodMigrations`. A constraint expressed only as hand-written SQL in a migration would be
  invisible to push mode — dev and test would run unguarded. `afterSchemaInit` is read by
  both paths, because both build the same runtime Postgres adapter from `payload.config.ts`.
- A **partial** index (`WHERE enrollment_status <> 'CANCELLED'`) is required, not a plain
  unique index on `(student_id, course_id)`: spec.md's Clarification Q2 requires a CANCELLED
  enrollment not to block re-registration. A plain compound-unique constraint cannot express
  "unique except when this column has value X" — Postgres partial indexes exist for exactly
  this.
- Confirmed via `node_modules/.pnpm/@payloadcms+drizzle@.../dist/postgres/types.d.ts`:
  `afterSchemaInit` hooks receive `{ adapter, extendTable, schema }`, where
  `schema.tables.enrollments` is the already-built Drizzle table and `extendTable` can add to
  its `extraConfig` (index/constraint builders) without redeclaring columns.

**Alternatives considered**:

- _Plain compound unique index, unconditionally._ Rejected — blocks re-registration after
  cancellation outright.
- _Application-level check only (`payload.find` before `payload.create`, no DB constraint)._
  Rejected outright by FR-017, which explicitly requires the guard to hold under concurrent
  submissions; a check-then-insert done as two separate steps is racy by construction — both
  requests can see "no existing enrollment" before either writes.
- _A `beforeValidate` hook doing the same check._ Same race as above.
- _A raw `INSERT ... ON CONFLICT ... DO NOTHING` via `payload.db.drizzle` directly, bypassing
  `payload.create` for this one insert._ Would give the most direct read of the conflict
  outcome, but throws away Payload's own hooks/access-control/typed builder for this one
  write and duplicates the field list by hand. Rejected on "simple first."

## Decision 2 — Recognising the constraint violation without depending on raw driver errors

**Decision**: Do a `payload.find` pre-check for an existing active enrollment first (fast,
clear path for the overwhelming majority of requests — no race), and treat any
`ValidationError` (imported from `'payload'`) thrown specifically by the
`payload.create({ collection: 'enrollments', ... })` call as the duplicate signal for the
rare genuine race. Both paths throw the same `EnrollmentAlreadyExists` error (Decision 3)
with the same student-facing message.

**Rationale**:

- Read `@payloadcms/drizzle`'s `dist/upsertRow/handleUpsertError.js` directly: Payload's
  Postgres adapter already intercepts a raw Postgres `23505` (unique_violation) inside
  `payload.create`/upsert and converts it to a Payload `ValidationError` **before** it ever
  reaches application code — the original `pg` error (with its `.code` and `.constraint`
  name) is not preserved on what gets thrown. Catching for `error.code === '23505'` in the
  service, as one might expect from raw `pg`, would never fire here.
- `ValidationError.errors[0].path` is Payload's best-effort field name, resolved from
  `adapter.fieldConstraints` (populated only for Payload-level `unique: true` fields — our
  index isn't one) or, failing that, a regex over the driver's `detail` string. For a
  composite key this yields the literal string `"student_id, course_id"` — usable, but a
  string this specific is a poor long-term identifier: it depends on column _order_ in the
  index definition and on Postgres's own detail-message format, neither of which this
  feature controls.
- Given that, the catch is narrowed twice, not by string-matching `path`: (a) it wraps only
  the single `payload.create` call for the `enrollments` collection, never the whole
  transaction (so a `ValidationError` from the sibling `notifications` insert is never
  mistaken for a duplicate), and (b) it is documented as a load-bearing coupling for whoever
  next adds a field to `Enrollments` — see the INVARIANTS.md entry this feature added.

**Alternatives considered**:

- _Catch on `error.errors?.[0]?.path`._ Considered as a second check to distinguish this
  constraint from some hypothetical future `unique: true` field on `Enrollments`, but
  rejected as the primary signal — see above.
- _Skip the pre-check, rely solely on the constraint._ Rejected on UX and on FR-020 (no raw
  storage-layer error reaching the student) — routing every duplicate through Payload's
  generic `ValidationError` path for what is, in practice, almost never a real race is
  unnecessary indirection for the common case.

## Decision 3 — Error shape: extend the established `APIError` subclass pattern

**Decision**: `EnrollmentAlreadyExists extends APIError` in `src/lib/errors/enrollment.ts`,
constructed with the fixed message "Bạn đã đăng ký khóa học này rồi."
`createEnrollmentAction` gained a `try/catch` (it had none before Story 3) that maps this one
class to its message and rethrows anything else — mirroring `loginAction`'s existing
`instanceof` chain against `src/lib/errors/auth.ts`.

**Rationale**: matches the one error-class-per-refusal convention already established
(`LoginRefused`, `EmailNotVerified`) — a unit test mocking `@/services/student-enrollment`
keeps the class import lightweight, without pulling in Payload config.

**Note on a pre-existing gap this closed**: before Story 3, `createEnrollmentAction` had no
`try/catch` around `createStudentEnrollment` at all — a course-window refusal
(`validateCourseForEnrollment` throwing a plain `Error`) already propagated uncaught out of
the server action. `CourseRegistrationForm`'s client-side `.catch()` still showed _a_ message
(the generic fallback), so nothing crashed, but Story 4's FR-008 ("each refusal reaches the
student as its own message") was not actually satisfied for those cases by Story 3's own
`try/catch` alone — giving every `validateCourseForEnrollment` message its own typed error is
Story 4's job.

## Decision 4 — Migration authoring

**Decision**: Hand-write the migration SQL (in the same style as
`20260914_120000_add_enrollments_collection.ts`) rather than running `payload migrate:create`
to autogenerate it, because the local dev database already had the schema applied via push
and running the generator against it would diff against an already-current database and
produce an empty or misleading migration.

**Rationale**: consistent with how the sibling migration in this feature area was authored;
keeps production's applied history in an explicit, reviewable SQL statement — shipped as
`src/migrations/20260914_130000_add_enrollment_active_guard.ts`.

## Decision 5 — Profile-completeness check ordering: sign-in and standing gates run first

**Decision**: Inside `createEnrollmentAction`, the profile-completeness check runs _after_
the existing sign-in check (`requireLogin`) and account-standing check (`STANDING_REFUSAL`),
and _before_ the course/duplicate checks in `createStudentEnrollment`. It is not a top-level
Zod shape check like `courseId`'s.

**Rationale**: `CourseRegistrationForm` renders unconditionally, including for a signed-out
visitor (Story 1). A signed-out visitor's form has no profile fields to show at all — there
is no student to show them for — so their submission must reach the sign-in redirect exactly
as it does for Story 1, never a "your profile is incomplete" message. If fullName/phone were
validated as part of a single top-level request-shape check (the way `courseId` is), a
signed-out submission with blank/absent fullName/phone would be rejected for the wrong reason
before the sign-in check ever ran. Checking profile completeness only once a signed-in,
`ACTIVE` student is confirmed avoids that misattribution, and matches the same ordering
reasoning Story 1 already applied to putting "not signed in" ahead of course-specific
refusals.

**Alternatives considered**:

- _One combined Zod schema for `{courseId, fullName, phone}` at the top, like `courseId`
  alone was before._ Rejected — produces the wrong refusal for a signed-out visitor.

## Decision 6 — The profile save commits independently of the enrollment attempt

**Decision**: `createEnrollmentAction` saves the submitted `fullName`/`phone` (via
`updateStudentProfile`) as its own `payload.update`, _before_ calling the existing
`createStudentEnrollment`. It is not part of `createStudentEnrollment`'s own transaction.

**Rationale**: FR-006 requires a profile correction to persist even when the registration
attempt that follows it fails for an unrelated reason (course window closed, duplicate
enrollment — Story 3). Payload's `update` on `students` and the `enrollments` transaction in
`processEnrollmentTransaction` are already two separate database operations against two
different collections; keeping the profile save as its own committed step means a later
failure in the enrollment step has nothing to roll back on the profile side.

**Alternatives considered**:

- _Save the profile inside `processEnrollmentTransaction`, same transaction as the enrollment
  insert._ Rejected outright by FR-006 — a rollback on a duplicate-enrollment or
  course-window refusal would undo the profile save too.

## Decision 7 — `createStudentEnrollment`'s existing signature is untouched

**Decision**: `updateStudentProfile(studentId, fullName, phone)` is called directly by
`createEnrollmentAction`, using the `student` and `payload` it already has in scope from the
sign-in/standing checks — not threaded through `createStudentEnrollment(courseId)`, whose
signature stays exactly as Stories 1/3 left it.

**Rationale**: minimises the blast radius. `createStudentEnrollment`'s existing unit tests
(`tests/unit/services/student-enrollment.spec.ts`,
`tests/unit/services/student-enrollment-notifications.spec.ts`) mock it by courseId alone;
leaving its signature untouched means neither file needed to change for Story 2. Only
`createEnrollmentAction`'s exported signature changes (Decision 8).

**Alternatives considered**:

- _Extend `createStudentEnrollment(courseId, fullName, phone)`._ Rejected — touches a
  function two prior stories already tested and shipped, for no benefit.

## Decision 8 — `createEnrollmentAction`'s signature becomes one input object

**Decision**: `createEnrollmentAction(courseId: number)` became
`createEnrollmentAction(input: CreateEnrollmentInput)` where
`CreateEnrollmentInput = { courseId: number; fullName?: string; phone?: string }` (both
optional at the type level — enforced as required only by Decision 5's later, signed-in-only
check).

**Rationale**: matches the one-object-argument shape `loginAction(input: LoginInput)` already
uses in this codebase, rather than growing a second and third positional parameter.
`fullName`/`phone` are optional in the type because a signed-out submission has none to send.

**Known ripple, accepted**: every existing call site and test asserting
`createEnrollmentAction(12)` or `.toHaveBeenCalledWith(12)` changed shape to
`createEnrollmentAction({ courseId: 12, fullName: '...', phone: '...' })`. This touched
`tests/unit/actions/student-enrollment-action.spec.ts` (Stories 1 and 3's tests live here)
and `CourseRegistrationForm.tsx`'s call site. `findCourseSlug`, `createStudentEnrollment`,
and their own tests were unaffected (Decision 7).

**Alternatives considered**:

- _Add `fullName`/`phone` as new positional parameters._ Rejected — three positional
  parameters of the same primitive type invite argument-order mistakes.
- _A second action, e.g. `submitEnrollmentWithProfile`, leaving `createEnrollmentAction`
  untouched._ Rejected — would leave two ways to create an enrollment, one of which no
  longer enforces FR-015 at all.

## Decision 9 — Validation: parameterise `profileSchema` into a factory, don't fork it

**Decision**: `src/lib/validation/profile-schema.ts` changed from a flat `z.object({...})`
into `makeProfileSchema(options?: { required?: boolean })`, a factory returning the lenient
shape (blank allowed) by default and the strict shape (non-blank, `.trim()`) when
`required: true`. `export const profileSchema = makeProfileSchema()` keeps `/tai-khoan`'s
behaviour byte-for-byte identical. `VIETNAM_PHONE_REGEX` gained `export`. New file
`src/lib/validation/enrollment-profile-schema.ts` is three lines:
`export const enrollmentProfileSchema = makeProfileSchema({ required: true })` plus its
inferred type. Used both server-side (`createEnrollmentAction`) and client-side
(`zodResolver(enrollmentProfileSchema)` in `CourseRegistrationForm`).

**Rationale**: revised from an earlier "separate schema, share only the regex" draft after
review — one factory is a smaller, more honest expression of "these are the same two fields
with a stricter and a looser reading" than two independently-typed `z.object` literals that
would drift out of sync over time. `/tai-khoan`'s file is touched, but its _behaviour_ is
not: `profileSchema` still resolves to exactly the object it was before, verified by the
existing `tests/unit/lib/profile-schema.spec.ts` staying green unmodified.

**Alternatives considered**:

- _A wholly separate `enrollmentProfileSchema` object, sharing only the regex constant._
  Superseded — two schema literals is more duplication than one parameterised factory for
  what is, structurally, the same rule twice.
- _Reuse `profileSchema` as-is (no strict mode at all)._ Rejected — it accepts empty strings
  for both fields, so it cannot express "required."

## Decision 10 — Client-side field visibility only when signed in

**Decision**: `page.tsx` passes `fullName`, `phone`, `email` down to `CourseRegistration`
→ `CourseRegistrationForm` only when `getSessionStudent()` returned a student (the same
`student` already resolved there for `enrollmentStatus`). All three props are optional; when
absent, the form renders exactly as it does for a signed-out visitor (courseId + submit
only), who still reaches the sign-in redirect on submit per Decision 5.

**Rationale**: there is no profile to show for a visitor who is not signed in; showing blank
required-looking inputs before sign-in would misrepresent whose data they are.
