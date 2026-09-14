# Implementation Plan: Enrollment Duplicate Guard

**Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature; see spec header)

**Date**: 2026-09-14

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-enrollment-duplicate-guard/spec.md`

## Summary

A student may hold at most one _active_ enrollment (any status except `CANCELLED`) per
course. Enforced with a Postgres partial unique index on
`enrollments (student_id, course_id) WHERE enrollment_status <> 'CANCELLED'` — the
correctness backstop under concurrent submissions (FR-002) — plus an application-level
`payload.find` pre-check that gives the ordinary, non-racing case a fast, specific refusal.
Both paths raise the same new `EnrollmentAlreadyExists` error, mapped by
`createEnrollmentAction` to a fixed Vietnamese message. No new entity, no new field, no
change to the action's public shape (`CreateEnrollmentState` already carries `message`).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (existing stack — unchanged)

**Primary Dependencies**: Payload CMS 3, `@payloadcms/db-postgres` / `@payloadcms/drizzle`
(already in use; this feature uses their `afterSchemaInit` schema-hook API for the first
time in this repo)

**Storage**: PostgreSQL — one new partial unique index on the existing `enrollments` table;
no new table, no new column

**Testing**: Vitest — `tests/unit` (service logic, error mapping, mocked Payload) and
`tests/int` (the actual concurrency case, needs a real Postgres connection pool — a mocked
`payload.create` cannot exercise a real race)

**Target Platform**: Server (Next.js server actions / Payload local API) — no client-visible
API change beyond a new possible `message` string

**Project Type**: Web application (existing single Next.js + Payload project — no new
project or package)

**Performance Goals**: N/A beyond "no added delay" (SC-004) — one extra indexed lookup
(`payload.find` by `student_id, course_id`) on the success path, which the existing
`enrollments_student_idx` / `enrollments_course_idx` indexes already support

**Constraints**: Must hold under concurrent submissions for the same (student, course)
without relying on a check-then-insert alone (FR-002); must never surface a raw
storage-layer error to the student (FR-006)

**Scale/Scope**: One collection, one new index, one new error class, one action's
`try/catch`. No new screens.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — still holds._

- **Simple first**: the design is one partial index + one pre-check query + one error
  class + one `try/catch`. The raw-SQL-insert alternative (Decision 1 in `research.md`)
  was rejected specifically for being more machinery than the problem needs.
- **Change only what was asked**: touches `Enrollments` collection config,
  `payload.config.ts` (adds one `afterSchemaInit` hook), `student-enrollment.ts`,
  `create-enrollment.ts`, one new migration, one new error module. Nothing in the CTA/Form
  beyond surfacing whatever `message` the action already returns (no new prop, no new UI
  branch — `Out of Scope` in the spec).
- **Tests — every change**: the required/suggested test lists are drafted and put to the
  user via `AskUserQuestion` _before_ implementation begins, per the settled decision — not
  part of this planning artifact itself.
- **Invariants are maintained as you go**: this design uncovers a constraint that breaks
  silently and is forward-facing — flagged below for an INVARIANTS.md entry to add
  _during implementation_, not deferred:

  > A `ValidationError` thrown while creating an `Enrollment` is read by
  > `createStudentEnrollment` as "duplicate active enrollment for this (student, course)."
  > The collection has no other `unique: true` field today. Adding one later will make its
  > violations indistinguishable from a duplicate-enrollment refusal unless that catch is
  > narrowed (e.g. by checking `error.errors[0].path`) at the same time.

- **No agent-session references / Co-Authored-By only**: applies at commit time, not to
  this planning artifact.
- **Spec Kit workflow**: followed — `/speckit-specify` → this `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement` (or the equivalent test-list-then-code cadence
  already used for the sibling feature 007, at the user's direction).

No violations requiring `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/008-enrollment-duplicate-guard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
└── quickstart.md         # Phase 1 output
```

No `contracts/` directory: this feature exposes no new interface. The server action
`createEnrollmentAction(courseId): Promise<CreateEnrollmentState>` keeps its existing
signature; only the set of possible `message` strings grows. `CreateEnrollmentState` itself
(`src/actions/student/create-enrollment.ts`) is the contract, already documented there.

### Source Code (repository root)

Existing single-project layout — no new top-level directory.

```text
src/
├── payload.config.ts                       # + one afterSchemaInit hook (partial unique index)
├── migrations/
│   └── <timestamp>_add_enrollment_active_guard.ts   # new — hand-written, mirrors the
│                                                       existing Enrollments migration's style
├── lib/errors/
│   └── enrollment.ts                       # new — EnrollmentAlreadyExists (extends APIError)
├── services/
│   └── student-enrollment.ts               # + pre-check, + narrow catch around the
│                                              enrollments payload.create call
└── actions/student/
    └── create-enrollment.ts                # + try/catch mapping EnrollmentAlreadyExists

tests/
├── unit/
│   ├── services/student-enrollment.spec.ts          # extend: duplicate → EnrollmentAlreadyExists,
│   │                                                    CANCELLED-only → succeeds
│   └── actions/student-enrollment-action.spec.ts    # extend: duplicate → its own message
└── int/
    └── <new>: concurrent-submission test against real Postgres (the one case a mock
        cannot exercise — see quickstart.md §5)
```

**Structure Decision**: single existing project, no restructuring. Every touched file
already exists except the two new small modules (one error class, one migration) — matches
"the least code that solves the stated problem."

## Phase 0 — done

See `research.md`: four decisions (index shape and placement; how the violation is
recognised without depending on raw driver errors; the error-class shape; migration
authoring). No `NEEDS CLARIFICATION` remained after the spec's Q1 was resolved.

## Phase 1 — done

See `data-model.md` (the one new rule, no new entity/field) and `quickstart.md` (five
runnable validation scenarios covering SC-001 through SC-004 and the concurrent case).

## Next

`/speckit-tasks` to break this into ordered, checkable steps — or, matching how 007 was
actually carried out, straight into drafting the required/suggested test list for the
user's `AskUserQuestion` sign-off, then implementing stage by stage.
