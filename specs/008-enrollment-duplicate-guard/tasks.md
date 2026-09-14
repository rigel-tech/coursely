---
description: 'Task list for Enrollment Duplicate Guard'
---

# Tasks: Enrollment Duplicate Guard

**Input**: Design documents from `specs/008-enrollment-duplicate-guard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md — all present.

**Tests**: Included. This repo's constitution (`CLAUDE.md`, "Every test is written first
and observed red") makes tests non-optional for a change with executable behaviour, not a
per-feature choice — this list is the "required" draft that still goes through the
project's own `AskUserQuestion` sign-off (untick/tick/add) before any implementation task
below starts. Nothing here is written before that sign-off.

**Organization**: One user story in `spec.md` (P1) — no cross-story split needed.

## Path Conventions

Existing single Next.js + Payload project. All paths below are real, existing files except
the two new modules called out explicitly.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The error type and the database constraint every part of the story depends on.
No project scaffolding is needed — every touched file already exists except these two new
modules.

- [ ] T001 [P] Create `EnrollmentAlreadyExists` (extends `APIError`, fixed message "Bạn đã
      đăng ký khóa học này rồi.") in new file `src/lib/errors/enrollment.ts`, following the
      shape of `LoginRefused`/`EmailNotVerified` in `src/lib/errors/auth.ts`.
- [ ] T002 Add one `afterSchemaInit` hook to `postgresAdapter({...})` in
      `src/payload.config.ts`, using `extendTable` to add a partial unique index
      `enrollments_active_student_course_idx` on `enrollments (student_id, course_id)
    WHERE enrollment_status <> 'CANCELLED'` (research.md Decision 1).
- [ ] T003 Hand-write migration `src/migrations/<timestamp>_add_enrollment_active_guard.ts`
      with `up`/`down` creating/dropping the same index by the same name as T002, in the
      raw-SQL style of `src/migrations/20260914_120000_add_enrollments_collection.ts`
      (research.md Decision 4). Depends on T002 (must name the identical index).

**Checkpoint**: Restart `pnpm dev` once; confirm the index exists (quickstart.md §1)
before writing story tests against it.

---

## Phase 2: User Story 1 - Stopped from enrolling twice (Priority: P1) 🎯 MVP

**Goal**: A student cannot end up with more than one active enrollment in the same course,
through any path, including two submissions arriving at nearly the same instant — and the
refusal reads as plain language, never a database error.

**Independent Test**: Enrol a student in a course, submit the same registration again for
the same student/course; confirm the second attempt is refused, exactly one enrollment
exists afterward, and the first is unchanged (spec.md's own Independent Test).

### Tests for User Story 1

> Write these first, run them against the unmodified code, and confirm each fails for the
> reason it exists — not an import error or a misconfigured mock — per the constitution.
> The exact set below is what goes to `AskUserQuestion` before any test file is written.

- [ ] T004 [P] [US1] Unit test in `tests/unit/services/student-enrollment.spec.ts`:
      creating an enrollment when an active (non-CANCELLED) one already exists for the
      same student/course throws `EnrollmentAlreadyExists`, and `payload.create` for
      `enrollments` is never called.
- [ ] T005 [P] [US1] Unit test in `tests/unit/services/student-enrollment.spec.ts`: when
      the student's only existing enrollment for the course is CANCELLED, creating a new
      one succeeds (FR-008) — confirms the guard is status-aware, not existence-only.
- [ ] T006 [P] [US1] Unit test in `tests/unit/services/student-enrollment.spec.ts`: a
      `ValidationError` thrown by the `enrollments` `payload.create` call (simulating the
      database catching a race the pre-check missed) is translated to
      `EnrollmentAlreadyExists` too — both paths converge on the same error.
- [ ] T007 [P] [US1] Unit test in `tests/unit/actions/student-enrollment-action.spec.ts`:
      `createEnrollmentAction` maps `EnrollmentAlreadyExists` to its own message, distinct
      from the generic "Không thể đăng ký khóa học..." fallback and from every other
      refusal message already covered (FR-003).
- [ ] T008 [US1] Integration test, new file `tests/int/enrollment-duplicate-guard.spec.ts`:
      two concurrent `createStudentEnrollment` calls for the same student/course against
      real Postgres resolve to exactly one enrollment row and one rejection — the one case
      a mocked `payload.create` cannot exercise (FR-002, quickstart.md §5). Needs
      `docker compose up -d`.

### Implementation for User Story 1

- [ ] T009 [US1] In `src/services/student-enrollment.ts`, add a `payload.find` pre-check
      (`where: { student, course, enrollmentStatus: { not_equals: 'CANCELLED' } }`,
      `limit: 1`) before creating the enrollment; throw `EnrollmentAlreadyExists` on a hit.
      Depends on T001.
- [ ] T010 [US1] In the same file, narrow a `try/catch` around only the `enrollments`
      `payload.create` call inside `processEnrollmentTransaction`, catching Payload's
      `ValidationError` and rethrowing as `EnrollmentAlreadyExists` — the race-safety
      backstop the pre-check alone cannot provide (FR-002). Depends on T001, T002/T003.
- [ ] T011 [US1] In `src/actions/student/create-enrollment.ts`, add the `try/catch` this
      action currently has none of, mapping `EnrollmentAlreadyExists` to its message and
      rethrowing anything else unrecognised (mirrors `loginAction`'s `instanceof` chain).
      Depends on T009, T010.
- [ ] T012 [US1] Add the INVARIANTS.md entry drafted in `plan.md`'s Constitution Check —
      that a `ValidationError` from creating an `Enrollment` is read as a duplicate
      refusal, and what adding a future `unique: true` field to `Enrollments` must account
      for. Same commit as T010, per the constitution's own rule on maintaining invariants
      as you go.

**Checkpoint**: Story 1 is the whole feature — run quickstart.md §2–5 end to end.

---

## Final Phase: Polish

- [ ] T013 [P] `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` — all green.
- [ ] T014 `pnpm exec vitest run --config ./vitest.config.mts tests/int --no-file-parallelism`
      (this repo's Postgres connection pool needs sequential file execution for `tests/int`
      today — see the working notes from feature 007) — confirms T008 passes for real.
- [ ] T015 Walk `quickstart.md` once by hand against a dev database.

---

## Dependencies & Execution Order

- **Foundational (Phase 1)** blocks everything — T002 before T003; T001 has no dependency
  and can run alongside them.
- **User Story 1 (Phase 2)** depends entirely on Phase 1. Within it: T004–T008 (tests) are
  written and observed red before T009–T012 (implementation); T009 and T010 both touch
  `student-enrollment.ts` and are sequential, not parallel, despite both being tagged
  [US1]; T011 depends on both.
- **Polish** depends on Phase 2 being complete.
- No second user story exists to sequence against.

## Parallel Example: Foundational

```text
Task: "Create EnrollmentAlreadyExists in src/lib/errors/enrollment.ts"        (T001)
Task: "Add afterSchemaInit partial unique index in src/payload.config.ts"     (T002)
```

## Parallel Example: User Story 1 tests

```text
Task: "Unit test — duplicate active enrollment throws"                        (T004)
Task: "Unit test — CANCELLED-only enrollment allows re-registration"          (T005)
Task: "Unit test — ValidationError path also throws EnrollmentAlreadyExists"  (T006)
Task: "Unit test — action maps the error to its own message"                  (T007)
```

`T008` (the `tests/int` concurrency test) is not included above — it needs T002/T003
already applied to a real database and is written after the unit tests establish the
error's shape, not in parallel with them.

## Implementation Strategy

Single story, so there is no MVP-vs-later split within this feature: Foundational → Story
1 tests (red) → Story 1 implementation (green) → Polish is the whole delivery, matching how
`specs/007-enrollment-login-gate` was carried out in stages with a sign-off between each.
