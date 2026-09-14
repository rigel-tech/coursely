# Phase 0 Research: Enrollment Profile Completeness

## Decision 1 — Ordering: sign-in and standing gates run before the profile-completeness gate

**Decision**: Inside `createEnrollmentAction`, the profile-completeness check runs _after_
the existing sign-in check (`signInFirst`) and account-standing check (`STANDING_REFUSAL`),
and _before_ the course/duplicate checks already in `createStudentEnrollment`. It is not a
top-level Zod shape check like `courseId`'s.

**Rationale**: `CourseRegistrationForm` renders unconditionally, including for a signed-out
visitor (established in specs/007). A signed-out visitor's form has no profile fields to
show at all — there is no student to show them for — so their submission must reach the
sign-in redirect exactly as it does today, never a "your profile is incomplete" message.
If fullName/phone were validated as part of a single top-level request-shape check (the
way `courseId` is), a signed-out submission with blank/absent fullName/phone would be
rejected for the wrong reason before the sign-in check ever ran. Checking profile
completeness only once a signed-in, `ACTIVE` student is confirmed avoids that
misattribution, and matches the same reasoning `specs/007-enrollment-login-gate` already
applied to ordering "not signed in" ahead of course-specific refusals.

**Alternatives considered**:

- _One combined Zod schema for `{courseId, fullName, phone}` at the top, like `courseId`
  alone is today._ Rejected — produces the wrong refusal for a signed-out visitor, as above.

## Decision 2 — The profile save commits independently of the enrollment attempt

**Decision**: `createEnrollmentAction` saves the submitted `fullName`/`phone` (via a new
service function, `ensureCompleteProfile`) as its own `payload.update`, _before_ calling
the existing `createStudentEnrollment`. It is not part of `createStudentEnrollment`'s own
transaction.

**Rationale**: FR-005 requires a profile correction to persist even when the registration
attempt that follows it fails for an unrelated reason (course window closed, duplicate
enrollment — specs/008). Payload's `update` on `students` and the `enrollments` transaction
in `processEnrollmentTransaction` are already two separate database operations against two
different collections; keeping the profile save as its own committed step (not wrapped
inside, or run after opening, the enrollment transaction) means a later failure in the
enrollment step has nothing to roll back on the profile side. No new transaction
coordination is needed — the two operations were never going to share one.

**Alternatives considered**:

- _Save the profile inside `processEnrollmentTransaction`, same transaction as the
  enrollment insert._ Rejected outright by FR-005 — a rollback on a duplicate-enrollment
  or course-window refusal would undo the profile save too.

## Decision 3 — `createStudentEnrollment`'s existing signature is untouched

**Decision**: `ensureCompleteProfile(studentId, fullName, phone)` is called directly by
`createEnrollmentAction`, using the `student` and `payload` it already has in scope from
the sign-in/standing checks — not threaded through `createStudentEnrollment(courseId)`,
whose signature stays exactly as specs/007/008 left it.

**Rationale**: minimises the blast radius (Principle III). `createStudentEnrollment`'s
existing unit tests (`tests/unit/services/student-enrollment.spec.ts`,
`tests/unit/services/student-enrollment-notifications.spec.ts` — both from specs/008)
mock it by courseId alone; leaving its signature untouched means neither file needs to
change for this feature. Only `createEnrollmentAction`'s exported signature changes (see
Decision 4), which is the smaller and more contained ripple.

**Alternatives considered**:

- _Extend `createStudentEnrollment(courseId, fullName, phone)`._ Rejected — touches a
  function two prior features already tested and shipped, for no benefit: the action
  already resolves the same `student`/`payload` values needed to save the profile
  directly, with no extra Payload boot required.

## Decision 4 — `createEnrollmentAction`'s signature becomes one input object

**Decision**: `createEnrollmentAction(courseId: number)` becomes
`createEnrollmentAction(input: CreateEnrollmentInput)` where
`CreateEnrollmentInput = { courseId: number; fullName?: string; phone?: string }`
(both optional at the type level — enforced as required only by Decision 1's later,
signed-in-only check).

**Rationale**: matches the one-object-argument shape `loginAction(input: LoginInput)`
already uses in this codebase, rather than growing a second and third positional
parameter. `fullName`/`phone` are optional in the type because a signed-out submission
(or one from a client that renders no profile fields) has none to send.

**Known ripple, accepted**: every existing call site and test asserting
`createEnrollmentAction(12)` or `.toHaveBeenCalledWith(12)` changes shape to
`createEnrollmentAction({ courseId: 12, fullName: '...', phone: '...' })`. This touches
`tests/unit/actions/student-enrollment-action.spec.ts` (specs/007 and specs/008's tests
live here) and `CourseRegistrationForm.tsx`'s call site. `findCourseSlug`,
`createStudentEnrollment`, and their own tests are unaffected — see Decision 3.

**Alternatives considered**:

- _Add `fullName`/`phone` as new positional parameters._ Rejected — three positional
  parameters of the same primitive type (`number`, `string`, `string`) invite
  argument-order mistakes that an object shape does not.
- _A second action, e.g. `submitEnrollmentWithProfile`, leaving `createEnrollmentAction`
  untouched._ Rejected — would leave two ways to create an enrollment, one of which
  (the old signature) no longer enforces FR-003 at all; exactly the kind of gap
  specs/007/008 both closed for their own conditions.

## Decision 5 — Validation: parameterise `profileSchema` into a factory, don't fork it

**Decision**: `src/lib/validation/profile-schema.ts` changes from a flat
`z.object({...})` into `makeProfileSchema(options?: { required?: boolean })`, a factory
returning the lenient shape (blank allowed) by default and the strict shape (non-blank,
`.trim()`) when `required: true`. `export const profileSchema = makeProfileSchema()`
keeps `/tai-khoan`'s behaviour byte-for-byte identical — same export, same runtime shape,
same default. `VIETNAM_PHONE_REGEX` gains `export`. New file
`src/lib/validation/enrollment-profile-schema.ts` is now three lines:
`export const enrollmentProfileSchema = makeProfileSchema({ required: true })` plus its
inferred type. Used both server-side (`createEnrollmentAction`) and client-side
(`zodResolver(enrollmentProfileSchema)` in `CourseRegistrationForm`) — the same
client/server split `LoginForm` + `loginSchema`/`loginInputSchema` already established.

**Rationale**: revised from an earlier "separate schema, share only the regex" draft after
review — one factory is a smaller, more honest expression of "these are the same two
fields with a stricter and a looser reading" than two independently-typed `z.object`
literals that would drift out of sync over time (e.g. a `maxLength` change made in one and
not the other). `/tai-khoan`'s file is touched, but its _behaviour_ is not: `profileSchema`
still resolves to exactly the object it was before, verified by the existing
`tests/unit/lib/profile-schema.spec.ts` staying green unmodified.

**Alternatives considered**:

- _A wholly separate `enrollmentProfileSchema` object, sharing only the regex constant_
  (the original Decision 5). Superseded — see above; two schema literals is more
  duplication than one parameterised factory for what is, structurally, the same rule
  twice.
- _Reuse `profileSchema` as-is (no strict mode at all)._ Rejected — it accepts empty
  strings for both fields, so it cannot express "required"; would not satisfy FR-003.

## Decision 6 — Client-side field visibility only when signed in

**Decision**: `page.tsx` passes `fullName`, `phone`, `email` down to
`CourseRegistrationCTA` → `CourseRegistrationForm` only when `getSessionStudent()` returned
a student (i.e. the same `student` already resolved there for `enrollmentStatus`). All
three props are optional; when absent, the form renders exactly as it does today (courseId

- submit only) for a signed-out visitor, who still reaches the sign-in redirect on submit
  per Decision 1.

**Rationale**: there is no profile to show for a visitor who is not signed in; showing
blank required-looking inputs before sign-in would misrepresent whose data they are.
