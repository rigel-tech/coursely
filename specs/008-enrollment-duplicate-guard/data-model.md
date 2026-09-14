# Phase 1 Data Model: Enrollment Duplicate Guard

No new entity and no new field. This feature adds one constraint over the existing
`Enrollment` entity (`src/collections/Enrollments/index.ts`).

## Enrollment (existing — unchanged fields)

Relevant fields only:

| Field              | Type                      | Notes                                                                           |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------- |
| `student`          | relationship → `students` | required                                                                        |
| `course`           | relationship → `courses`  | required                                                                        |
| `enrollmentStatus` | select                    | `NEW` \| `CONFIRMED` \| `ATTENDED` \| `COMPLETED` \| `CANCELLED`, default `NEW` |

## New rule: at most one active enrollment per (student, course)

- **Scope**: one `student` × one `course`.
- **Active** = `enrollmentStatus <> 'CANCELLED'`. `CANCELLED` is excluded — a student may
  hold any number of `CANCELLED` enrollments for the same course over time (this feature
  never deletes or merges them), but at most one non-`CANCELLED` one at a time.
- **Enforcement layer**: a Postgres partial unique index on
  `(student_id, course_id) WHERE enrollment_status <> 'CANCELLED'`, the single source of
  truth for correctness. An application-level `payload.find` pre-check exists only to give
  the common, non-racing case a fast, specific refusal — it is not itself a guarantee (see
  `research.md` Decision 1–2).
- **No state transitions are added.** This feature does not introduce a cancel flow or
  change what triggers `CANCELLED`; it only reads that value.

## New error type

`EnrollmentAlreadyExists` (extends `APIError`, `src/lib/errors/enrollment.ts`) — thrown by
the service when either the pre-check or the database constraint detects an existing
active enrollment for the same (student, course) pair. Carries no data beyond the fixed
Vietnamese message; nothing downstream needs to distinguish _which_ enrollment already
exists.
