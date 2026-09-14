# Phase 1 Data Model: Enrollment Profile Completeness

No new entity, no new field, no schema/migration change. This feature adds one new
validation schema and one new server-side save step, both operating on fields the
`Student` collection already has.

## Student (existing — unchanged fields)

| Field      | Type     | Nullable                  | Notes                                                             |
| ---------- | -------- | ------------------------- | ----------------------------------------------------------------- |
| `fullName` | `string` | yes (`?: string \| null`) | can be blank on an existing account                               |
| `phone`    | `string` | yes (`?: string \| null`) | can be blank; format not enforced by the collection schema itself |
| `email`    | `string` | **no** — always present   | Payload's own auth field; this feature only displays it           |

## New validation: `enrollmentProfileSchema`

`src/lib/validation/enrollment-profile-schema.ts` (new file):

- `fullName`: required, trimmed, 1–255 characters (matching the collection's own
  `maxLength: 255`).
- `phone`: required, trimmed, must match `VIETNAM_PHONE_REGEX` (imported from
  `src/lib/validation/profile-schema.ts` — the one standard for a valid Vietnamese phone
  number already used at `/tai-khoan`).

This schema is stricter than the existing `profileSchema` (which allows blank) and is
scoped to this registration context only — `/tai-khoan`'s own schema/action are untouched
(Q3).

## New input shape: `CreateEnrollmentInput`

Replaces the current bare `courseId: number` parameter of `createEnrollmentAction`:

```ts
type CreateEnrollmentInput = {
  courseId: number
  fullName?: string
  phone?: string
}
```

`fullName`/`phone` are optional at this type level because a signed-out visitor's
submission has none to send (research.md Decision 1/6) — they become required only once
the action has confirmed a signed-in, `ACTIVE` student.

## State: nothing persists beyond the two existing writes

- A `students` row's `fullName`/`phone` may be updated (via the new `ensureCompleteProfile`
  service call) — same fields, same collection, same access pattern
  (`overrideAccess: true`, scoped to the signed-in student's own id) already used
  elsewhere in this service.
- The `enrollments` row created afterward is exactly what specs/007/008 already produce —
  unchanged.
