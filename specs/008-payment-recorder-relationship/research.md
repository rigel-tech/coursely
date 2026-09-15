# Phase 0 Research: Payment Recorder Relationship

No `[NEEDS CLARIFICATION]` markers remained in the Technical Context, so this phase
records the decisions made from reading the existing codebase rather than resolving
open unknowns.

## Decision: Ship as part of the first `payments` migration, not an ALTER

- **Decision**: Change `recordedBy` → `userId` directly in `Payments.fields`, then run
  `pnpm payload migrate:create` to generate a single new migration for the collection.
- **Rationale**: `src/migrations/` has no entry creating a `payments` table (confirmed via
  `grep -rl "payments" src/migrations`). The collection was added to `payload.config.ts`
  in commit `09f7770` but never migrated into Postgres on this branch. There is no live
  `recorded_by` column to rename or backfill.
- **Alternatives considered**: A two-step migration (create table with `recorded_by`, then
  a second migration renaming/retyping it) — rejected as pure churn; nothing has run the
  first migration yet, so there's nothing to preserve by splitting it.

## Decision: New `RecorderCell` component, same pattern as `StudentCell`

- **Decision**: Add `src/collections/Payments/components/RecorderCell.tsx`, structurally
  identical to `StudentCell.tsx` — checks `cellData` for an object (populated `User`) vs.
  a number (unresolved id) vs. absent, renders `fullName || email` or `—`.
- **Rationale**: `Users` collection (`src/collections/Users/index.ts`) has the same shape
  relevant here as `Students`: `fullName` field plus Payload's built-in `auth: true`
  `email`. Reusing the exact resolution rule keeps the two list columns visually and
  behaviorally consistent (spec Assumptions, FR-005).
- **Alternatives considered**: Generalizing `StudentCell` into a shared
  `RelationNameCell<T>` used by both fields — rejected per Constitution Principle II
  (no abstraction for two call sites when the task didn't ask for one) and Principle III
  (don't touch `StudentCell.tsx`, which isn't broken).

## Decision: `userId` relationship has no `relationTo` narrowing beyond `users`

- **Decision**: `relationTo: 'users'`, no filter on user role/type.
- **Rationale**: `Payment.recordedBy`'s existing admin description says "ID of the staff
  member" without referencing a role field, and `Users` has no role/type field to filter
  on today. Spec Assumptions documents this explicitly.
- **Alternatives considered**: None — no narrower relation target exists in the schema.

## Decision: No delete-restriction hook on `User` → `Payment.userId`

- **Decision**: Leave `users` deletion unrestricted by this relationship, same as
  `students` deletion is today for `Payments.studentId`.
- **Rationale**: Spec Edge Cases requires the Payments list to render gracefully when the
  referenced account no longer exists (empty/fallback cell, not an error) rather than
  preventing deletion. Matches existing, already-accepted behavior for `studentId`.
- **Alternatives considered**: A `beforeDelete` hook on `Users` blocking deletion when
  referenced by a payment — rejected as unrequested scope (Principle II/III); would also
  be inconsistent with `students`, which has no such guard.
