# Implementation Plan: Student Enrollment

**Branch**: `feat/student-enrollment` | **Merged**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-student-enrollment/spec.md` — itself a
merge of three specs planned separately (`007-enrollment-login-gate`,
`008-enrollment-duplicate-guard`, `009-enrollment-profile-completeness`). This file merges
their three plans the same way; each one's own Phase 0/1 outputs are combined in
`research.md`/`data-model.md` rather than repeated three times here.

## Summary

Four stories, all shipped, gate a course registration in this order inside
`createEnrollmentAction`: (1) signed-in and in good standing, or redirect to sign-in with a
server-derived return address (Story 1); (2) a complete, validly-formatted profile — saved
independently of whether the enrollment itself succeeds (Story 2); (3) course validity and
window; (4) at most one active enrollment per (student, course), backed by a Postgres partial
unique index plus an application pre-check for the ordinary case (Story 3). Every refusal
these gates can distinguish reaches the student as its own message; only a truly unmapped
failure falls back to the generic retry copy (Story 4). No new entity; no new screen.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (existing stack)

**Primary Dependencies**: Payload CMS 3, `@payloadcms/db-postgres` / `@payloadcms/drizzle`
(`afterSchemaInit` used here for the first time in this repo), `react-hook-form` +
`zodResolver` (already in use, reused for the profile fields)

**Storage**: PostgreSQL — one new partial unique index on `enrollments`
(`research.md` Decision 1); one additional `payload.update` on `students` per registration
attempt with a signed-in student. No new table, no new column.

**Testing**: Vitest — `tests/unit` (service logic, action mapping, form/CTA rendering,
mocked Payload) and `tests/int` (`tests/int/enrollment-duplicate-guard.spec.ts` — the one
case, concurrency, that a mock cannot exercise)

**Target Platform**: Server (Next.js server actions / Payload local API) + two existing
client components (`CourseRegistrationCTA`, `CourseRegistrationForm`)

**Project Type**: Web application — existing single Next.js + Payload project, no new
project or package

**Performance Goals**: N/A beyond "no added delay" for the ordinary path — one extra indexed
`payload.find` (duplicate pre-check) and one extra `payload.update` (profile save) per
attempt, both single indexed operations

**Constraints**: The duplicate guard must hold under concurrent submissions without relying
on a check-then-insert alone; no raw storage-layer error may reach the student; a profile
correction must not be rolled back by an unrelated registration failure; `/tai-khoan`'s own
schema/action stay untouched

**Scale/Scope**: One collection index, one new error class, one new validation schema/module,
one changed action signature, two changed client components, one changed server page. No new
screens, no new route.

## Constitution Check

_GATE: re-checked at merge time — still holds for all three original stories._

- **Simple first**: Story 3 is one partial index + one pre-check query + one error class +
  one `try/catch` (the raw-SQL-insert alternative was rejected for being more machinery than
  needed). Story 2 is one `payload.update` + one schema factory; the enrollment path itself
  is untouched.
- **Change only what was asked**: `/tai-khoan`, `ProfileForm`, `updateProfileAction`, and
  `profileSchema`'s default behaviour are all explicitly left untouched (`research.md`
  Decisions 7, 9). Story 3 touches only `Enrollments` config, `payload.config.ts`,
  `student-enrollment.ts`, `create-enrollment.ts`, one migration, one error module.
- **Tests — every change**: each story's required/suggested test list went to
  `AskUserQuestion` before its own implementation began, per the settled decision — not
  repeated here; `tasks.md` records what was actually built and tested.
- **Invariants are maintained as you go**: Story 3 uncovered a constraint that breaks
  silently and is forward-facing, added to `INVARIANTS.md` in the same change: a
  `ValidationError` thrown while creating an `Enrollment` is read by
  `createStudentEnrollment` as "duplicate active enrollment for this (student, course)" — the
  collection has no other `unique: true` field today, so adding one later must narrow that
  catch too. Story 2 introduced no comparable constraint (confirmed at the time).
- **No agent-session references / Co-Authored-By only**: applies at commit time.
- **Spec Kit workflow**: each story followed `/speckit-specify` → `/speckit-plan` →
  (`/speckit-tasks` for Stories 2/3) → the test-list-then-implement cadence, staged with a
  sign-off between each. This merge itself is a documentation consolidation of already-shipped
  work, not a new behaviour change, so it does not re-run that cycle.

No violations requiring `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/007-student-enrollment/
├── plan.md          # This file
├── research.md      # Phase 0 — 10 decisions merged from Stories 2/3
├── data-model.md     # Phase 1 — merged
├── quickstart.md     # Phase 1 — merged, all four stories
├── tasks.md          # Phase 2 — merged, all tasks already completed
└── checklists/
    └── requirements.md
```

No `contracts/` directory: `createEnrollmentAction(input: CreateEnrollmentInput):
Promise<CreateEnrollmentState>` is the one interface these stories touch, already documented
in `data-model.md` and at its declaration site in
`src/actions/student/create-enrollment.ts`.

### Source Code (repository root)

Existing single-project layout — no new top-level directory.

```text
src/
├── payload.config.ts                       # Story 3: afterSchemaInit partial unique index
├── migrations/
│   └── 20260914_130000_add_enrollment_active_guard.ts   # Story 3
├── lib/
│   ├── errors/enrollment.ts                # Story 3: EnrollmentAlreadyExists
│   └── validation/
│       ├── profile-schema.ts               # Story 2: makeProfileSchema factory
│       └── enrollment-profile-schema.ts    # Story 2: enrollmentProfileSchema
├── services/
│   ├── student-enrollment.ts               # Stories 1/3: gate ordering, pre-check, narrow catch
│   └── student-profile.ts                  # Story 2: updateStudentProfile — later shared
│                                              (follow-up refactor) with /tai-khoan's own
│                                              updateProfileAction, not a second copy
└── actions/student/
    └── create-enrollment.ts                # Stories 1–4: CreateEnrollmentInput shape,
                                               the full refusal try/catch chain

src/components/public/
├── CourseRegistrationCTA.tsx                # Story 2: fullName?/phone?/email? props
└── forms/CourseRegistrationForm.tsx         # Story 2: editable inputs, zodResolver

src/app/(frontend)/courses/[slug]/page.tsx   # Story 2: passes profile fields when signed in

tests/
├── unit/
│   ├── services/student-enrollment.spec.ts
│   ├── services/student-enrollment-notifications.spec.ts
│   ├── actions/student-enrollment-action.spec.ts
│   └── components/{course-registration-form,course-registration-cta}.spec.tsx
└── int/
    └── enrollment-duplicate-guard.spec.ts   # Story 3's concurrency case
```

**Structure Decision**: single existing project, no restructuring. Every touched file already
existed except the small new modules called out above (one error class, one migration, one
validation module) — matches "the least code that solves the stated problem," across all
three original stories.

## Phase 0 / Phase 1 — done

See `research.md` (10 decisions) and `data-model.md` (no new entity; Story 3's one rule,
Story 2's one schema and one input shape).

## Phase 2 — done

See `tasks.md` — every task from all three original feature areas, merged into one ordered
list, all already implemented and tested.
