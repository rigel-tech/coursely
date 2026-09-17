# Data Model: Student Enrollment

No new entity or collection across any of the four stories. Story 3 adds one constraint to
`Enrollment`; Story 2 adds one validation schema and one input shape, both over fields
`Student` already has. Story 1 and 4 add no data-model change at all — routing and messaging
only.

## Enrollment (existing — unchanged fields)

Relevant fields only (`src/collections/Enrollments/index.ts`):

| Field              | Type                      | Notes                                                                           |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------- |
| `student`          | relationship → `students` | required                                                                        |
| `course`           | relationship → `courses`  | required                                                                        |
| `enrollmentStatus` | select                    | `NEW` \| `CONFIRMED` \| `ATTENDED` \| `COMPLETED` \| `CANCELLED`, default `NEW` |

### New rule (Story 3): at most one active enrollment per (student, course)

- **Scope**: one `student` × one `course`.
- **Active** = `enrollmentStatus <> 'CANCELLED'`. A student may hold any number of
  `CANCELLED` enrollments for the same course over time, but at most one non-`CANCELLED` one
  at a time.
- **Enforcement layer**: a Postgres partial unique index on
  `(student_id, course_id) WHERE enrollment_status <> 'CANCELLED'`, the single source of
  truth for correctness. An application-level `payload.find` pre-check exists only to give
  the common, non-racing case a fast, specific refusal — it is not itself a guarantee (see
  `research.md` Decisions 1–2).
- **No state transitions added.** No cancel flow was introduced; this rule only reads
  `enrollmentStatus`.

### New error type (Story 3, Story 4 consumes it)

`EnrollmentAlreadyExists` (extends `APIError`, `src/lib/errors/enrollment.ts`) — thrown by
the service when either the pre-check or the database constraint detects an existing active
enrollment for the same (student, course) pair. Carries no data beyond the fixed Vietnamese
message.

## Student (existing — unchanged fields)

| Field      | Type     | Nullable                  | Notes                                                             |
| ---------- | -------- | ------------------------- | ----------------------------------------------------------------- |
| `fullName` | `string` | yes (`?: string \| null`) | can be blank on an existing account                               |
| `phone`    | `string` | yes (`?: string \| null`) | can be blank; format not enforced by the collection schema itself |
| `email`    | `string` | **no** — always present   | Payload's own auth field                                          |

### New validation (Story 2): `enrollmentProfileSchema`

`src/lib/validation/enrollment-profile-schema.ts` (new file):

- `fullName`: required, trimmed, 1–255 characters (matching the collection's own
  `maxLength: 255`).
- `phone`: required, trimmed, must match `VIETNAM_PHONE_REGEX` (exported from
  `src/lib/validation/profile-schema.ts`).

Stricter than the existing `profileSchema` (which allows blank) and scoped to this
registration context only — `/tai-khoan`'s own schema/action are untouched.

### New input shape (Story 2): `CreateEnrollmentInput`

Replaced the previous bare `courseId: number` parameter of `createEnrollmentAction`:

```ts
type CreateEnrollmentInput = {
  courseId: number
  fullName?: string
  phone?: string
}
```

`fullName`/`phone` are optional at this type level because a signed-out visitor's submission
has none to send (`research.md` Decisions 5/10) — they become required only once the action
has confirmed a signed-in, `ACTIVE` student.

### State: nothing persists beyond the two existing writes

- A `students` row's `fullName`/`phone` may be updated (via `updateStudentProfile`) — same
  fields, same collection, same access pattern (`overrideAccess: true`, scoped to the
  signed-in student's own id) already used elsewhere in this service.
- The `enrollments` row created afterward is exactly what Story 1's gate and Story 3's guard
  already produce — unchanged by Story 2.
