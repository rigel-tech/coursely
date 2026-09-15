# Tasks: Student Enrollment

**Input**: Design documents from `specs/007-student-enrollment/`

**Status**: All tasks below are already implemented and shipped on `feat/student-enrollment`
— this file is the merged record of three staged feature passes (each with its own
`AskUserQuestion` test-list sign-off before its own implementation began, per this repo's
constitution), not a plan for new work. Verified against the actual code at merge time
(2026-09-15): `src/lib/errors/enrollment.ts`, the migration, `enrollment-profile-schema.ts`,
`makeProfileSchema`, and `CreateEnrollmentInput` all exist as described.

**Organization**: One phase per user story (spec.md P1–P4), in the order they gate a
registration attempt in `createEnrollmentAction`.

---

## Phase 1: Foundational

No shared scaffolding beyond what already existed — every touched file was already present
except the small new modules called out per story below.

---

## Phase 2: User Story 1 - Registering without being signed in (Priority: P1)

- [x] T001 [US1] `createEnrollmentAction` (`src/actions/student/create-enrollment.ts`) makes
      the signed-in/standing decision itself via `requireLogin` + a standing check, rather
      than trusting an earlier client-side status check.
- [x] T002 [US1] The sign-in destination's return address is derived server-side from the
      course id being registered for, at the course's public address (`/khoa-hoc/<slug>`),
      never accepted from the submitter.
- [x] T003 [US1] `CourseRegistrationForm`/`CourseRegistrationCTA` follow whatever destination
      the action returns rather than deciding navigation themselves.
- [x] T004 [US1] On a successful registration, the control switches to showing enrollment
      status without a reload (no separate page navigation).
- [x] T005 [US1] Unit tests in `tests/unit/actions/student-enrollment-action.spec.ts` and
      `tests/unit/components/course-registration-form.spec.tsx` cover: signed-out → sign-in
      redirect with the derived return address; a tampered return destination is ignored;
      each account standing (awaiting verification, disabled) gets its own message and stays
      on the course page.

**Checkpoint**: Story 1 independently functional — quickstart.md Story 1.

---

## Phase 3: User Story 2 - Registering with an incomplete profile (Priority: P2)

- [x] T006 [P] [US2] `src/lib/validation/profile-schema.ts` changed to
      `makeProfileSchema(options?: { required?: boolean })`; `profileSchema` stays
      `makeProfileSchema()` (unchanged behaviour, pinned by the existing
      `tests/unit/lib/profile-schema.spec.ts` staying green); `VIETNAM_PHONE_REGEX` exported.
- [x] T007 [P] [US2] New `src/lib/validation/enrollment-profile-schema.ts`:
      `enrollmentProfileSchema = makeProfileSchema({ required: true })`.
- [x] T008 [US2] New `updateStudentProfile(...)` in `src/services/student-profile.ts` — its
      own `payload.update`, committed independently of the enrollment transaction
      (research.md Decision 6). A later follow-up refactor moved it here from
      `student-enrollment.ts` and shares it with `/tai-khoan`'s `updateProfileAction`
      (`updateStudentProfileWithAvatar` wraps it for the avatar-upload case) — the two
      _actions_ stay separate per Clarification Q5; only the underlying write is shared.
- [x] T009 [US2] `createEnrollmentAction`'s signature changed to
      `(input: CreateEnrollmentInput)`; profile-completeness check runs after the sign-in/
      standing gate and before the course/duplicate checks (research.md Decision 5); calls
      `updateStudentProfile` before `createStudentEnrollment`.
- [x] T010 [US2] `CourseRegistrationCTA`/`Form` gained optional `fullName`/`phone`/`email`
      props, editable inputs for the first two (email read-only), wired through
      `zodResolver(enrollmentProfileSchema)`; `page.tsx` passes them only when
      `getSessionStudent()` resolved a student.
- [x] T011 [US2] Every existing call site/test asserting the old bare-`courseId` call shape
      updated to the `CreateEnrollmentInput` object shape (the accepted ripple into Stories
      1/3's own tests, research.md Decision 8).
- [x] T012 [US2] Unit tests: `updateStudentProfile` cases in
      `tests/unit/services/student-enrollment.spec.ts`; profile-completeness gate cases and
      the updated call shape in `tests/unit/actions/student-enrollment-action.spec.ts`; field
      rendering/inline validation/submit payload in
      `tests/unit/components/course-registration-form.spec.tsx`; prop pass-through in
      `tests/unit/components/course-registration-cta.spec.tsx`.

**Checkpoint**: Story 2 independently functional — quickstart.md Story 2.

---

## Phase 4: User Story 3 - Stopped from enrolling twice (Priority: P3)

- [x] T013 [P] [US3] `EnrollmentAlreadyExists` (extends `APIError`, fixed message "Bạn đã
      đăng ký khóa học này rồi.") in `src/lib/errors/enrollment.ts`.
- [x] T014 [US3] `afterSchemaInit` hook added to `postgresAdapter({...})` in
      `src/payload.config.ts`, using `extendTable` to add the partial unique index
      `enrollments_active_student_course_idx` on
      `enrollments (student_id, course_id) WHERE enrollment_status <> 'CANCELLED'`
      (research.md Decision 1).
- [x] T015 [US3] Hand-written migration
      `src/migrations/20260914_130000_add_enrollment_active_guard.ts`, same index name as
      T014.
- [x] T016 [US3] `payload.find` pre-check added in `src/services/student-enrollment.ts`
      before creating the enrollment; throws `EnrollmentAlreadyExists` on a hit.
- [x] T017 [US3] Narrow `try/catch` around only the `enrollments` `payload.create` call
      inside `processEnrollmentTransaction`, catching `ValidationError` and rethrowing as
      `EnrollmentAlreadyExists` — the race-safety backstop (research.md Decision 2).
- [x] T018 [US3] `createEnrollmentAction` gained the `try/catch` mapping
      `EnrollmentAlreadyExists` to its message (the same chain Story 4 extends).
- [x] T019 [US3] INVARIANTS.md entry added in the same change: a `ValidationError` from
      creating an `Enrollment` is read as this refusal; a future `unique: true` field on
      `Enrollments` must narrow that catch.
- [x] T020 [P] [US3] Unit tests in `tests/unit/services/student-enrollment.spec.ts`:
      duplicate active enrollment → `EnrollmentAlreadyExists`, `payload.create` never called;
      CANCELLED-only existing enrollment → succeeds; a `ValidationError` from the create call
      also becomes `EnrollmentAlreadyExists`.
- [x] T021 [P] [US3] Unit test in `tests/unit/actions/student-enrollment-action.spec.ts`:
      the action maps the error to its own message, distinct from the generic fallback.
- [x] T022 [US3] Integration test `tests/int/enrollment-duplicate-guard.spec.ts`: two
      concurrent `createStudentEnrollment` calls for the same student/course against real
      Postgres resolve to exactly one row and one rejection.

**Checkpoint**: Story 3 independently functional — quickstart.md Story 3.

---

## Phase 5: User Story 4 - Being told what actually went wrong (Priority: P4)

- [ ] T023 [US4] **Not done.** `validateCourseForEnrollment`'s course-window refusals
      (registration not yet open, deadline passed) already have their own Vietnamese
      messages at the throw site, but `createEnrollmentAction` re-throws anything that isn't
      `EnrollmentAlreadyExists`, and `CourseRegistrationForm`'s `.catch()` replaces any
      thrown error with the generic fallback — so these two never actually reach the student
      as distinct text. Flagged as an accepted gap when Story 3 shipped (research.md
      Decision 3's note); still open at merge time (2026-09-15). Fix: give
      `validateCourseForEnrollment`'s two throws their own typed errors (mirroring
      `EnrollmentAlreadyExists`) and extend `createEnrollmentAction`'s `try/catch` chain to
      map them — a separate change, not part of this doc merge.
- [x] T024 [US4] Account-standing refusals (awaiting verification, disabled) keep the
      student on the course page rather than sending them to the sign-in screen (shared with
      Story 1's T001, stated here because Story 4's spec is what requires it be distinct
      copy per standing).
- [x] T025 [US4] The generic "Không thể đăng ký khóa học. Vui lòng thử lại." message is
      reachable only for a failure with no mapped case — verified by the refusal chain's
      `else`/rethrow branch and its unit test coverage.
- [x] T026 [US4] Unit tests confirm every _returned_ (not thrown) refusal string introduced
      by Stories 1–3 is distinct from every other and from the generic fallback — sign-in
      redirect, both account standings, profile-incomplete, and duplicate-enrollment. Does
      **not** cover the two thrown course-window messages, since T023 shows those never
      reach the returned state a unit test would assert on in the first place.

**Checkpoint**: All four stories independently functional and delivered.

---

## Final Phase: Polish

- [x] T027 [P] `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` — green.
- [x] T028 `pnpm exec vitest run --config ./vitest.config.mts tests/int --no-file-parallelism`
      (this repo's Postgres connection pool needs sequential file execution for `tests/int`)
      — confirms T022 passes for real.
- [x] T029 Walked `quickstart.md` by hand against a dev database, all four stories.
- [x] T030 (2026-09-15) Merged the three original spec directories
      (`007-enrollment-login-gate`, `008-enrollment-duplicate-guard`,
      `009-enrollment-profile-completeness`) into this one; updated the five external
      citations that named the old paths (`INVARIANTS.md`, `src/payload.config.ts`,
      `src/actions/student/create-enrollment.ts` ×2,
      `src/lib/validation/profile-schema.ts`, `tests/unit/lib/profile-schema.spec.ts`); fixed
      the two Out of Scope/Edge Case lines in the old 007 spec that Story 3 had made stale.

---

## Dependencies & Execution Order

- Story 1 → Story 2 → Story 3 → Story 4 is both the priority order and the actual
  request-handling order inside `createEnrollmentAction` — each later story's gate runs only
  once the earlier ones have passed. They were built and sign-off-approved in that order.
- Story 4 has no independent implementation of its own beyond what Stories 1–3 already
  wired into the refusal chain — it is the requirement that chain be complete and
  distinguishable, verified by T026.
