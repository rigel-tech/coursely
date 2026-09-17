# Quickstart: Enrollment Payments Join

## Prerequisites

- `docker compose up -d` (Postgres running — this feature needs `tests/int/`, migrations, and a
  live admin session; it cannot be validated with `tests/unit/` alone)
- Migrations applied: `pnpm payload migrate`
- `pnpm generate:types` run after the collection config changes, so `Enrollment['payments']` and
  `Payment['enrollmentId']` (now an object) exist in `src/payload-types.ts`
- `pnpm dev` running, signed in to `/admin` as a `users`-collection (staff) account

## Scenario 1 — view payments on an enrollment (User Story 1, FR-001–003)

1. Open an existing enrollment in `/admin/collections/enrollments/<id>` that already has payments
   recorded against it (via `payload.create({ collection: 'payments', ... })` in a script, or the
   existing Payments admin screen, pointing `enrollmentId` at that enrollment's id).
2. Confirm the enrollment's edit view shows a "Payments" section listing exactly those payments.
3. Open a different enrollment with no payments — confirm the section shows an empty state, not
   an error.

## Scenario 2 — add a payment from the enrollment page (User Story 2, FR-004–007)

1. On a saved enrollment's detail page, use the Payments section's "Create new" control.
2. Fill in the required `Payments` fields (`studentId`, `amount`, `paymentMethod`) and save.
3. Confirm: the new payment is now listed in that same section; `GET`/Local API `find` on
   `payments` for that id shows `enrollmentId` resolved to the enrollment just viewed;
   `paymentDate` and `userId` are auto-stamped exactly as they are when creating a payment from
   the standalone `Payments` list (unchanged hooks).
4. Repeat step 1–3 once more on the same enrollment — confirm both payments are listed.

## Scenario 3 — new, unsaved enrollment has no payments control (User Story 3, FR-008)

1. Start `/admin/collections/enrollments/create`, do not save.
2. Confirm there is no "create payment" control available yet (Payload's `join` field only
   renders its create action once the parent document has an id).
3. Save the enrollment. Confirm the control now appears on the resulting detail page.

## Regression checks

- `pnpm typecheck` — `src/payload-types.ts` regenerated and consistent.
- `pnpm lint` — theme-guard is irrelevant here (admin-only surface), eslint still applies.
- Existing `tests/unit/collections/payments-config.spec.ts`,
  `tests/unit/collections/enrollments-config.spec.ts` updated for the new field shapes and still
  passing.
- A `tests/int/` case creating a payment via Local API with a plain enrollment id (not an object)
  still succeeds — Payload accepts a bare id on write for a `relationship` field.
