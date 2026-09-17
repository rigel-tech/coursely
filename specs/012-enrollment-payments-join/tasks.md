---
description: 'Task list for Enrollment Payments Join'
---

# Tasks: Enrollment Payments Join

**Input**: Design documents from `/specs/012-enrollment-payments-join/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Required by `CLAUDE.md` ("Tests — every change") — included below. The exact set is
not final until the required/suggested lists go through the `AskUserQuestion` multi-select gate
before any implementation task in a phase starts.

**Organization**: Tasks are grouped by phase; Phase 3+ are grouped by user story (spec.md
priorities P1/P2/P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3) — Setup/Foundational/Polish
  tasks carry no story label

---

## Phase 1: Setup

**Purpose**: Confirm the environment this feature needs before touching schema.

- [x] T001 Run `docker compose up -d` and `pnpm payload migrate` against current `main`/branch
      state; confirm it completes clean with no pending migrations, establishing the baseline
      the new migration in Phase 2 builds on. (Local dev DB uses `docker-compose.local.yml` +
      drizzle-push, per `payload.config.ts`'s own comment — confirmed baseline schema in sync.)

**Checkpoint**: Postgres is up, migrations are current, `payments`/`enrollments` tables exist as
described in `data-model.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Turn `Payments.enrollmentId` into a real relationship to `enrollments`, with all
existing data preserved and the `depth: 0` admin-list trap already covered — required by both
User Story 1 and User Story 2 before any `Enrollments` UI work can start.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational phase ⚠️

> Write these first; run them against the unfixed code and confirm they fail for the right
> reason (assertion failure, not a missing import/config) before writing implementation.

- [x] T002 [P] Unit test: `Payments` collection config declares `enrollmentId` as
      `type: 'relationship'`, `relationTo: 'enrollments'`, `required: true` — extend
      `tests/unit/collections/payments-config.spec.ts`.
- [x] T003 [P] Int test: `payload.create({ collection: 'payments', data: { enrollmentId: <real id>, ... } })`
      persists a foreign key to that enrollment (not a bare number column) and
      `payload.findByID` round-trips it — extend `tests/int/payments-collection.spec.ts`.
- [x] ~~T004~~ Dropped by user decision: `tests/int` runs on drizzle-push (always current schema),
      never the hand-written migration path, so "old data survives migration" cannot be
      exercised there without standing up separate infra — out of proportion for this task.
      Verify manually against a real-data staging DB before deploying to prod.
- [x] T005 [P] Int test: reading a payment via a `depth: 0` list-style query (mirroring how
      `studentId`/`userId` are already asserted) returns `enrollmentId` as the populated
      enrollment document, not a raw id — extend `tests/int/payments-collection.spec.ts`.

### Implementation for Foundational phase

- [x] T006 Write `src/migrations/20260917_150000_convert_payments_enrollment_id_to_relationship.ts`:
      add `enrollment_id_id integer` FK to `enrollments(id)`, backfill from `enrollment_id::integer`,
      set `NOT NULL`, add index, drop the old `enrollment_id` column; `down()` reverses it. `ON
    DELETE set null` chosen to mirror the existing (also `NOT NULL`) `student_id_id` FK in this
      table — documented inline as a pre-existing pattern, not a new decision.
- [x] T007 Registered in `src/migrations/index.ts`.
- [x] T008 `src/collections/Payments/index.ts`: `enrollmentId` is now
      `type: 'relationship', relationTo: 'enrollments'` (name/required/label unchanged).
- [x] T009 `src/collections/Payments/hooks/populatePaymentRelations.ts`: added the `enrollmentId`
      resolution block; `INVARIANTS.md`'s depth-0 entry updated to name it.
- [x] T010 `pnpm generate:types` run; `src/payload-types.ts` reflects `enrollmentId: number | Enrollment`.
- [x] T011 T002/T003/T005 green; `pnpm test:int tests/int/payments-collection.spec.ts` — 22/22
      files, 135/135 tests pass. `pnpm typecheck` and `pnpm lint` also green (lint: 0 errors,
      pre-existing warnings only).

**Checkpoint**: `Payments.enrollmentId` is a verified relationship; existing data intact;
`populatePaymentRelations` covers all three relationship fields. Ready for `Enrollments` UI work.

---

## Phase 3: User Story 1 - View all payments for an enrollment (Priority: P1) 🎯 MVP

**Goal**: A saved enrollment's admin detail page lists every payment linked to it.

**Independent Test**: Open an enrollment with existing payments (seeded via Local API using the
now-relationship `enrollmentId`) and confirm all of them, and only them, are listed on its detail
page; an enrollment with none shows an empty state.

### Tests for User Story 1 ⚠️

- [x] T012 [P] [US1] Unit test added to `tests/unit/collections/enrollments-config.spec.ts`.
- [x] T013 [US1] Int test added as its own module, `tests/int/enrollments-payments-join.spec.ts`
      (per the "one spec per module" convention) — covers exact-match listing, cross-enrollment
      isolation, and the empty-list case. (The "old data survives migration" suggested test was
      dropped per user decision in Phase 2 — same reasoning applies here, not repeated.)

### Implementation for User Story 1

- [x] T014 [US1] Added the `payments` join field to `src/collections/Enrollments/index.ts`.
- [x] T015 [US1] `pnpm generate:types` run; `collectionsJoins.enrollments.payments` and
      `Enrollment.payments` now present in `src/payload-types.ts`.
- [x] T016 [US1] T012/T013 green; full `pnpm test:int` — 23/23 files, 138/138 tests pass.
      `pnpm typecheck` and `pnpm lint` also green (lint: 0 errors, pre-existing warnings only).

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Add a payment directly from an enrollment (Priority: P2)

**Goal**: From a saved enrollment's detail page, a staff member creates a new payment already
linked to that enrollment, through the same fields/hooks/access as creating one anywhere else.

**Independent Test**: From an enrollment's detail page, use the join field's "create new" action,
fill in the required `Payments` fields, save, and confirm the payment is linked and listed.

### Tests for User Story 2 ⚠️

- [x] T017 [US2] Int test added to `tests/int/enrollments-payments-join.spec.ts`: creating a
      payment with `enrollmentId` set to a given enrollment's id (the shape the join field's
      "create new" drawer submits) appears in that enrollment's `payments` join results, and
      `paymentDate`/`userId` are auto-stamped exactly as any other creation path.
- [x] T018 [US2] Int test added: creating two payments this way, back to back, against the same
      enrollment — both linked and both listed. Also folded in an amount-validation check
      (negative amount still rejected through this path).

### Implementation for User Story 2

- [x] T019 [US2] No code change needed — T017/T018 passed on the first run with zero
      implementation changes, confirming Payload's `join` field `admin.allowCreate` default
      (`true` in the installed v3.88.0) already covers this. **Caveat**: this confirms the data
      layer only (Local API). The admin UI's "Create new" button itself was not visually verified
      — no browser automation tool was available in this session (Claude in Chrome declined).
      Recommend a quick manual check in `/admin` before considering US2 fully done: open a saved
      enrollment, confirm the Payments section shows a working "Create new" action.
- [x] T020 [US2] Full suite green: `pnpm test:int` 23/23 files, 141/141 tests; `pnpm typecheck`
      and `pnpm lint` clean (0 errors, pre-existing warnings only).

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - New enrollment has no payments yet (Priority: P3)

**Goal**: An unsaved, in-progress new-enrollment form offers no way to add a payment, and shows
no broken control in its place.

**Independent Test**: Start `/admin/collections/enrollments/create`, confirm no payment-create
control renders before the first save; save, confirm it then appears.

### Verification for User Story 3

- [x] T021 [US3] Verified at the source, not just assumed: `@payloadcms/ui`'s `JoinField`
      (`node_modules/@payloadcms/ui/dist/fields/Join/index.js:180`) passes
      `allowCreate: typeof docID !== 'undefined' && allowCreate` to its `RelationshipTable` — the
      create action is gated on the parent document's id existing, unconditionally, for every
      `join` field in this Payload version. No project code controls this, so no project test can
      regress it; this is a framework guarantee, not a to-do. **Not independently browser-verified
      this session** (no Chrome automation available) — recommend a quick manual look at
      `/admin/collections/enrollments/create` per `quickstart.md` Scenario 3 as a sanity check,
      not because the source reading is in doubt.

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T022 [P] Reviewed both files against the final field shapes (`enrollmentId` as
      relationship→enrollments, `payments` join field) — both already cover them; no gaps found,
      no edit needed.
- [x] T023 Full suite run: `pnpm test:unit` — 445/446 passing (1 pre-existing, unrelated failure
      in `sidebar-grouping.spec.ts`, confirmed present on a clean `git stash` baseline before this
      feature's work began); `pnpm test:int` — 23/23 files, 141/141 tests green; `pnpm typecheck`
      clean; `pnpm lint` — 0 errors, pre-existing warnings only; `theme-guard` 0 violations.
- [ ] T024 Walk through `quickstart.md` Scenarios 1–3 end-to-end in the running admin UI. **Not
      performed this session** — no browser automation tool was available (Claude in Chrome
      declined). Scenario 1/2's data-layer behavior is covered by
      `tests/int/enrollments-payments-join.spec.ts`; Scenario 3's UI gating is confirmed at the
      Payload source level (see T021). Recommend the user do a final visual pass in `/admin`
      before merging.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no dependencies.
- **Foundational (Phase 2)** → depends on Phase 1; BLOCKS Phases 3–5.
- **User Story 1 (Phase 3)** → depends on Phase 2 only. This is the MVP slice.
- **User Story 2 (Phase 4)** → depends on Phase 2 and on the join field added in Phase 3 (T014);
  not independent of US1 the way the template's default assumes, because Payload's `join` field
  is the single mechanism that delivers both viewing (US1) and creating (US2) — documented here
  rather than forcing an artificial separation.
- **User Story 3 (Phase 5)** → depends on Phase 2 and Phase 3 (same join field); verification-only.
- **Polish (Phase 6)** → depends on all prior phases.

## Implementation Strategy

**This session**: Phases 1–2 (Setup + Foundational) — the shared backend change (migration,
field type, hook) that both user stories need, with no admin-UI-visible behavior change yet.

**Next increment**: Phase 3 (US1) alone is a demoable MVP — payments become visible on the
enrollment page. Phase 4 (US2) follows immediately after, since it rides the same join field.
Phase 5 (US3) is a fast verification pass. Phase 6 closes out.
