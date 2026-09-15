# Tasks: Payment Record Collection

**Input**: Design documents from `/specs/007-payment-record/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/payments-api.md, quickstart.md

**Tests**: Required by this repo's constitution (`CLAUDE.md` — "Tests — every change" / "Every
test is written first and observed red", both NON-NEGOTIABLE). The exact test set below was
settled with the requester via a multi-select prompt before this file was written — it is
final, not a default to prune.

**Organization**: Tasks are grouped by user story (spec.md P1/P2/P3) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact

## Path Conventions

Single project. Collection: `src/collections/Payments/index.ts`. Registration:
`src/payload.config.ts`. Tests: `tests/unit/collections/payments-config.spec.ts` (no infra),
`tests/int/payments-collection.spec.ts` (needs `docker compose up -d`).

---

## Phase 1: Setup

Not applicable — existing Next.js/Payload project, no new dependency and no scaffolding
beyond the collection file itself (created in Phase 2). Proceeds directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: A minimal, importable `Payments` collection so the tests written in every user
story phase fail on a real assertion (missing field, wrong access, no validation) rather than
on a module-not-found error — the failure this repo's "observed red" rule requires.

**⚠️ CRITICAL**: Must complete before any user-story test or implementation task.

- [x] T001 Create a minimal stub collection in `src/collections/Payments/index.ts`: `slug:
    'payments'`, empty `fields: []`, `access: { create: () => false, read: () => false,
    update: () => false, delete: () => false }`. Just enough to import without error —
      not the real shape.
- [x] T002 Register `Payments` in the `collections: [...]` array of `src/payload.config.ts`
      (placed under the "Academic" group comment block, alongside `Students`/`Courses`/
      `Classes`).
- [x] T003 Run `pnpm generate:types` and `pnpm generate:importmap` so `src/payload-types.ts`
      and `src/app/(payload)/admin/importMap.js` pick up the stub. Commit these generated
      files alongside the collection in this same change — never hand-edit them
      (`CLAUDE.md` Structure & commands).

**Checkpoint**: `Payments` exists, is registered, and imports cleanly — every user story can
now write tests against it.

---

## Phase 3: User Story 1 - Record a tuition payment (Priority: P1) 🎯 MVP

**Goal**: Staff can create/read/update/delete a payment record carrying the enrollment and
student it belongs to, the amount, method, and date — guarded by staff-only access.

**Independent Test**: quickstart.md steps 2, 3, 6 — create with all required fields succeeds;
missing any required field or an invalid `amount` is rejected; unauthenticated and
non-staff (`students`) access is rejected; a `users` staff account succeeds.

### Tests for User Story 1 — write first, run, confirm they FAIL on the stub for the right reason (not an import error), and show the failing output

- [x] T004 [P] [US1] Unit test in `tests/unit/collections/payments-config.spec.ts`: core
      field set is present with correct types/required flags —
      `enrollmentId`/`studentId`/`amount`/`paymentDate` (`number`/`number`/`number`/`date`,
      all required), `recordedBy`/`referenceNote` (`number`/`textarea`, optional),
      `paymentMethod` (`select`, required, exactly the 4 options `CASH`/`BANK_TRANSFER`/
      `CARD`/`OTHER`) — and every one of those fields plus every `paymentMethod` option
      carries a `label: { vi, en }` object (both non-empty strings). Model on
      `tests/unit/collections/students-config.spec.ts`.
- [x] T005 [P] [US1] Unit test, same file: `Payments.access.create`, `.read`, `.update`,
      `.delete` are all the shared `authenticated` predicate (`import { authenticated } from
    '@/access/authenticated'`), not a bespoke `Boolean(user)` check.
- [x] T006 [P] [US1] Unit test, same file: `payload.config.ts`'s `collections` array contains
      the `payments` slug (`await configPromise`, model on
      `students-config.spec.ts`'s "is registered as a collection").
- [x] T007 [P] [US1] Unit test, same file: the exported `amount` validate function rejects
      `0`, a negative number, and a non-integer (e.g. `1000.5`), and accepts a positive
      integer — call the function directly, no Payload instance needed.
- [x] T008 [P] [US1] Int test in `tests/int/payments-collection.spec.ts`: creating a payment
      with all required fields set succeeds (via `payload.create`); creating one with
      `enrollmentId`, `studentId`, `amount`, `paymentMethod`, or `paymentDate` missing is
      rejected in each case. Model on `tests/int/classes-collection.spec.ts`.
- [x] T009 [P] [US1] Int test, same file: creating a payment with `amount: 0`, a negative
      `amount`, or a non-integer `amount` (e.g. `1000.5`) is rejected end-to-end through the
      Local API — not just by the admin UI's `step` affordance.
- [x] T010 [P] [US1] Int test, same file: `payload.find({ collection: 'payments',
    overrideAccess: false })` is rejected with no `user`; rejected with a `students`
      principal (`{ ...student, collection: 'students' }`); succeeds with a `users` staff
      principal. Model on `rest-access-isolation.spec.ts`'s principal-construction pattern
      and `classes-collection.spec.ts`'s "denies read with no user" test.
- [x] T011 [US1] Run `pnpm test:unit` and `pnpm test:int` (`docker compose up -d` first).
      Confirm T004–T010 all fail against the Phase 2 stub, and that every failure is a real
      assertion mismatch (empty fields, `() => false` access, no validation) — not a missing
      import or a runner error. Capture the failing output.

### Implementation for User Story 1

- [x] T012 [US1] Replace the stub in `src/collections/Payments/index.ts` with the real core
      shape: `enrollmentId`, `studentId` (`number`, required), `amount` (`number`, required,
      `min: 1`, `admin.step: 1`, `validate:` an exported `validatePaymentAmount` function
      rejecting non-integers and values `< 1`), `paymentMethod` (`select`, required, 4
      options, `label: { vi, en }` on the field and every option — mirror
      `src/collections/AuditLogs/index.ts`'s `action` field shape), `paymentDate` (`date`,
      `pickerAppearance: 'dayAndTime'`, `displayFormat: 'dd/MM/yyyy HH:mm:ss'`, required),
      `recordedBy` (`number`, optional), `referenceNote` (`textarea`, optional). `access`:
      `authenticated` for all four operations (`import { authenticated } from
    '../../access/authenticated'`). `admin.group: adminGroups.academic`,
      `admin.defaultColumns: ['studentId', 'enrollmentId', 'amount', 'paymentMethod',
    'paymentDate']`. `timestamps: true`. Every field/option `label` in `{ vi, en }`.
- [x] T013 [US1] Re-run `pnpm generate:types` and `pnpm generate:importmap`.
- [x] T014 [US1] Re-run `pnpm test:unit` and `pnpm test:int`. Confirm T004–T010 are now green.

**Checkpoint**: User Story 1 is fully functional and independently testable/deliverable —
this is the MVP.

---

## Phase 4: User Story 2 - Attach proof of successful payment (Priority: P2)

**Goal**: Staff can optionally attach an image (screenshot/photo) as proof of a successful
payment to any payment record.

**Independent Test**: quickstart.md step 4 — create with `proofImage` set succeeds and the
image is retrievable from the record; create with `proofImage` omitted still succeeds.

### Tests for User Story 2 — write first, run, confirm they FAIL for the right reason

- [x] T015 [P] [US2] Extend `tests/unit/collections/payments-config.spec.ts`: `proofImage`
      is an `upload` field with `relationTo: 'media'`, not required, and carries a `label: {
    vi, en }`.
- [x] T016 [P] [US2] Extend `tests/int/payments-collection.spec.ts`: creating a payment with
      `proofImage` set to a real `media` document id succeeds and the saved doc's
      `proofImage` resolves to that id; creating a payment with `recordedBy`,
      `referenceNote`, and `proofImage` all omitted still succeeds.
- [x] T017 [US2] Run `pnpm test:unit` and `pnpm test:int`. Confirm T015–T016 fail because
      `proofImage` does not exist on the collection yet (not an import/runner error). Capture
      the failing output.

### Implementation for User Story 2

- [x] T018 [US2] Add `proofImage` (`type: 'upload'`, `relationTo: 'media'`, optional,
      `label: { vi, en }`) to `src/collections/Payments/index.ts`, mirroring
      `Students.avatar`'s shape.
- [x] T019 [US2] Re-run `pnpm generate:types` and `pnpm generate:importmap`.
- [x] T020 [US2] Re-run `pnpm test:unit` and `pnpm test:int`. Confirm T015–T016 are now green,
      and T004–T014 (US1) are still green.

**Checkpoint**: User Story 1 and User Story 2 both independently functional.

---

## Amendment — 2026-09-15: three corrections to the shipped MVP

Requested mid-implementation, after Phase 3 (US1) had already shipped and Phase 4 (US2) was
in progress. Test list settled via `AskUserQuestion` before any of this was implemented,
following the same required-tests-first rule as every other change. All are now done.

- [x] T025 [P] Unit test: `paymentDate` carries `admin.readOnly: true` (staff never enter it
      by hand), in `tests/unit/collections/payments-config.spec.ts`.
- [x] T026 [P] Unit test: `studentId` is now `type: 'relationship'`, `relationTo: 'students'`,
      still `required: true` — replaces its place in the old "plain number" assertion group
      (which now covers only `enrollmentId`/`recordedBy`), same file.
- [x] T027 [P] Unit test: `formatAmountDisplay`/`parseAmountInput` (Vietnamese thousands
      grouping, `1000000` ⇄ `"1.000.000"`) round-trip correctly, including empty/`NaN`/
      non-numeric input, same file.
- [x] T028 [P] Int test: creating a payment without `paymentDate` succeeds and the saved value
      is auto-filled to the save moment, in `tests/int/payments-collection.spec.ts`.
- [x] T029 [P] Int test, same file: supplying an explicit `paymentDate` is still overridden by
      the save moment (proves server-side enforcement, not just an admin-UI restriction).
- [x] T030 [P] Int test, same file: creating a payment with `studentId` pointing at a real
      `students` document succeeds and resolves correctly at `depth: 1`.
- [x] T031 Implementation: `src/collections/Payments/hooks/setPaymentDate.ts` (`beforeChange`,
      stamps `paymentDate = new Date()` on create only, never on update) wired into
      `Payments.hooks.beforeChange`; `paymentDate` field gets `admin.readOnly: true`.
      `studentId` field changed to `type: 'relationship', relationTo: 'students'`, plus a
      custom list-view `Cell` (`src/collections/Payments/components/StudentCell.tsx`) showing
      the student's `fullName` (falling back to `email`, matching how `Students` is looked up
      elsewhere) instead of Payload's default `useAsTitle` (`email`).
      `src/collections/Payments/formatAmount.ts` (pure `formatAmountDisplay`/
      `parseAmountInput`) plus a custom admin `Field` component
      (`src/collections/Payments/components/AmountField.tsx`) wired onto `amount` for live
      Vietnamese thousands-separator formatting while typing — the stored/validated value is
      still the plain integer `validatePaymentAmount` already guarded.
- [x] T032 Re-ran `pnpm generate:types` and `pnpm generate:importmap` (both new component
      string paths registered — confirmed by grepping the generated `importMap.js`, since the
      CLI's own "no new imports found" message was misleading here), then `pnpm test:unit`
      (304/304), `pnpm test:int` (124/124), `pnpm typecheck`, and `pnpm lint` (0 errors) all
      green. The `studentId` type change required a one-time interactive dev-schema-push
      resolution outside the test runner (drizzle-kit asked whether `student_id_id` was a new
      column or a rename of `student_id` — not scriptable from a non-interactive test run);
      resolved once directly against the dev Postgres container, after which the schema push
      applied cleanly on every subsequent run.

**Note for `/speckit-plan` history**: this amendment supersedes `research.md` §4 ("plain
numbers, not relationships") for `studentId` only — `enrollmentId`/`recordedBy` are unchanged
— and `data-model.md`'s `studentId` row and `paymentDate` row. `spec.md`'s FR-002, US1
Acceptance Scenario 1, and the Assumptions bullet about deferred relationships were updated to
match. Not re-run through `/speckit-specify`/`/speckit-plan` from scratch since this is a
correction within the same active feature, not a new one — but every artifact that named the
old shape was corrected in place rather than left to contradict the code, matching this
project's "never leave a stale rule beside the new one" convention for `INVARIANTS.md`.

---

## Phase 5: User Story 3 - Work in either Vietnamese or English (Priority: P3)

**Goal**: Every Payments field label and `paymentMethod` option reads correctly in whichever
admin-panel language (vi/en) is selected.

**Independent Test**: quickstart.md step 5 — switch the admin panel language and confirm
every field label and option renders in that language.

- [ ] T021 [US3] Manual verification only (quickstart.md step 5) — switch the `/admin`
      language to English, open Payments, confirm every field label and `paymentMethod`
      option is in English; switch to Vietnamese, confirm the same in Vietnamese. No new
      automated test: T004 and T015 already assert every `label` is a non-empty `{ vi, en }`
      pair, which is the regression guard for this story — labels were written bilingual
      from the start in T012/T018 rather than added as an afterthought, so there is nothing
      left to implement here.

**Checkpoint**: All three user stories independently functional and delivered.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T022 [P] Run `pnpm lint` and `pnpm typecheck`; fix anything either reports.
- [ ] T023 Resolve the INVARIANTS.md candidate flagged in `plan.md`'s Constitution Check: now
      that `Payments.enrollmentId` / `.recordedBy` exist as plain numbers with no
      relationship (per Amendment 2026-09-15 below, `studentId` is no longer part of this —
      it became a real relationship), decide whether this is a new entry (breaks silently,
      forward-facing, true today — e.g. "do not assume Payload will auto-populate these into
      objects; they are bare numbers until a future migration adds real relationships") and
      add it to `INVARIANTS.md` in this same change if so, per `CLAUDE.md`'s "Invariants are
      maintained as you go". If it does not qualify, say so and move on — no edit needed.
- [ ] T024 Run through `quickstart.md` end-to-end as a final check.

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: nothing to do — proceeds straight to Foundational.
- **Foundational (Phase 2)**: T001→T002→T003, sequential (each depends on the last). Blocks
  every user story.
- **User Story 1 (Phase 3)**: depends only on Foundational. T004–T010 in parallel (different
  test cases, same two files — safe as long as they're additive, not conflicting edits) →
  T011 (needs all of T004–T010 written) → T012 → T013 → T014.
- **User Story 2 (Phase 4)**: depends on Foundational; in practice also depends on User
  Story 1's T012 (same file, `proofImage` is added to the shape T012 created) — implement
  after Phase 3 completes rather than in parallel.
- **User Story 3 (Phase 5)**: depends on Phase 3 and Phase 4 (verifies labels already written
  in T012/T018) — no code, verification only.
- **Polish (Final Phase)**: depends on all three user stories being complete.

## Parallel Example: User Story 1

```text
# All Phase 3 test-writing tasks touch different assertions in the same two files —
# write them together, then run the suite once:
Task: "T004 Unit test: core field set + bilingual labels"
Task: "T005 Unit test: access predicates are `authenticated`"
Task: "T006 Unit test: registered in payload.config.ts"
Task: "T007 Unit test: amount validate() function"
Task: "T008 Int test: required-field create/reject"
Task: "T009 Int test: invalid amount rejected"
Task: "T010 Int test: access control"
```

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 2 (Foundational stub) → Phase 3 (US1: core fields, tests red then green).
2. **STOP and VALIDATE**: run quickstart.md steps 2/3/6 against the real admin panel.
3. That alone is a working, staff-only payment ledger — proof image and label-switching are
   additive from here.

### Incremental Delivery

1. Foundational → Phase 3 (US1) → validate → this is the MVP.
2. Phase 4 (US2: proof image) → validate independently (quickstart.md step 4).
3. Phase 5 (US3: bilingual verification) → validate (quickstart.md step 5).
4. Final Phase: lint/typecheck, the INVARIANTS.md decision, full quickstart.md run.

## Notes

- [P] tasks touch different assertions but the _same_ two test files within a phase — fine
  to write together since they're purely additive; do not run them as separate commits that
  each half-edit the same file.
- Every implementation task is preceded by its tests, written first and confirmed red for a
  real reason (T001–T003 exist specifically so "red" never means "cannot find module").
- Stop at each checkpoint (end of Phase 3, 4, 5) to validate that user story independently
  before moving on — per this project's "ship in small, approved stages" way of working.
