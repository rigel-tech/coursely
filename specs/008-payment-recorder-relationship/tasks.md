---
description: 'Task list for Payment Recorder Relationship'
---

# Tasks: Payment Recorder Relationship

**Input**: Design documents from `/specs/008-payment-recorder-relationship/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included — `CLAUDE.md`'s "Tests — every change" rule is NON-NEGOTIABLE for this
repo. Before any implementation task below is executed, the required/suggested test list
implied by these tasks MUST go through the `AskUserQuestion` multi-select gate described in
`CLAUDE.md`; nothing here is pre-approved. Every test task must be written, run, and shown
RED against the code as it stands at that point before its paired implementation task runs.

**Organization**: Grouped by user story per `spec.md` priorities (US1 = P1, US2 = P2).

## Path Conventions

Single project — `src/`, `tests/` at repository root (per `plan.md` Structure Decision).

## Phase 1: Setup

Not applicable — existing, already-initialized project; no scaffolding needed. Local
Postgres via `docker compose up -d` is a prerequisite environment step (see
`quickstart.md`), not a repo task.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The relationship field itself — both user stories depend on `userId` existing
as a real `relationship` field before either display (US1) or reference-integrity (US2)
can be demonstrated.

**⚠️ CRITICAL**: No user story task can begin until this phase is complete.

- [ ] T001 Update `tests/unit/collections/payments-config.spec.ts`: replace the
      `recordedBy`-as-plain-number assertions (currently lines ~46-58, in the "leaves
      recordedBy and referenceNote optional" and "types enrollmentId and recordedBy as plain
      numbers" tests, and the `CORE_FIELDS` list at line 27) with assertions that `userId` is a
      `relationship` field, `relationTo: 'users'`, optional. Run `pnpm test:unit` and confirm it
      fails RED (the field is still named `recordedBy` and typed `number`) for the right
      reason — a failing assertion on field name/type, not an import error.
- [ ] T002 In `src/collections/Payments/index.ts`, rename `recordedBy` → `userId` and
      change `type: 'number'` to `type: 'relationship'` with `relationTo: 'users'`, keeping it
      optional (no `required: true`) and its bilingual label. Update the module banner comment
      (lines 19-27) — it currently says `recordedBy` "chưa có relationship tới ... users", which
      this change supersedes; rewrite it to reflect that `userId` now _is_ a real relationship,
      while `enrollmentId` still is not. Confirm T001 now passes.
- [ ] T003 [P] Run `pnpm generate:types` to regenerate `src/payload-types.ts` — GENERATED
      file, do not hand-edit (per `CLAUDE.md` Structure & commands). Confirm
      `Payment.userId?: number | User | null` appears.
- [ ] T004 Extend `tests/int/payments-collection.spec.ts` with a `userId relationship`
      describe block, mirroring the existing `studentId relationship` block (~line 144):
      create a payment with `userId: staffUserId` (the `staffUserId` fixture already exists in
      `beforeAll`, currently unused by any payment payload), then `findByID` with `depth: 1`
      and assert the populated `User` has `id === staffUserId` and a truthy `email`. Run
      `pnpm test:int` (requires `docker compose up -d`) and confirm it fails RED — the
      `payments` table has no `user_id` column yet (no migration exists for this collection).
- [ ] T005 Run `pnpm payload migrate:create` to generate the first `payments`-table
      migration (includes `userId` as a foreign key to `users`, alongside every other existing
      `Payments` field, since no prior `payments` migration exists on this branch — see
      `research.md`). Add the generated file's entry to `src/migrations/index.ts` following the
      existing pattern (append, do not reorder).
- [ ] T006 Run `pnpm payload migrate` to apply it to the local Postgres instance. Re-run
      `pnpm test:int` from T004 and confirm it now passes GREEN.

**Checkpoint**: `userId` exists as a real, persisted relationship to `users`. Neither
story's user-facing behavior (list display, input constraint) is wired up yet.

---

## Phase 3: User Story 1 - Identify who recorded a payment (Priority: P1) 🎯 MVP

**Goal**: The Payments admin list shows, per row, the recording staff account's name (or
email) instead of a raw number — matching how the "Student" column already resolves
`studentId`.

**Independent Test**: Open `/admin/collections/payments`; the "Recorded By" column shows a
name/email for rows with `userId` set, and renders empty (not an error) for rows without
one.

### Tests for User Story 1 ⚠️

> Write first, run, confirm RED before the implementation tasks below.

- [ ] T007 [P] [US1] Create `tests/unit/collections/RecorderCell.spec.tsx` (new file —
      no prior test exists for `StudentCell` to mirror, so this establishes the pattern):
      render `RecorderCell` with `cellData` as a populated `User` object (`fullName` set →
      shows `fullName`; only `email` set → falls back to `email`), as a raw number (shows
      `#<id>`), and as `undefined`/`null` (shows `—`). Run `pnpm test:unit`, confirm it fails
      RED with a module-not-found error resolving to "component doesn't exist yet", not a
      typo in the test itself — i.e. read the failure and confirm it's the right reason.

### Implementation for User Story 1

- [ ] T008 [US1] Create `src/collections/Payments/components/RecorderCell.tsx`, structured
      identically to `src/collections/Payments/components/StudentCell.tsx` (same
      `DefaultCellComponentProps` shape, same object/number/empty branches), resolving a
      `User`'s `fullName || email`. Confirm T007 passes GREEN.
- [ ] T009 [US1] In `src/collections/Payments/index.ts`, wire
      `fields.userId.admin.components.Cell` to
      `'@/collections/Payments/components/RecorderCell#RecorderCell'` and add `'userId'` to
      `admin.defaultColumns` (currently `['studentId', 'enrollmentId', 'amount',
'paymentMethod', 'paymentDate']`).
- [ ] T010 [US1] Run `pnpm generate:importmap` to regenerate
      `src/app/(payload)/admin/importMap.js` — GENERATED file, do not hand-edit — so the string
      path from T009 resolves. Confirm the new entry for `RecorderCell` appears.
- [ ] T011 [US1] Manual check per `quickstart.md` "Manual check (admin panel)": `pnpm dev`,
      sign in as staff, open the Payments list, confirm the "Recorded By" column renders a
      name/email for a payment with `userId` set and renders empty for one without.

**Checkpoint**: User Story 1 fully functional and independently testable/demoable — this
alone is a shippable MVP.

---

## Phase 4: User Story 2 - Recorded-by values always reference a real account (Priority: P2)

**Goal**: Every `userId` value is guaranteed to reference an existing `users` document —
delivered as a side effect of the Foundational relationship-type change (Phase 2), not new
application code. This phase's job is to prove and guard that guarantee, not to build it.

**Independent Test**: Attempting to save a payment with a `userId` that does not correspond
to an existing `users` document is rejected by Payload's own relationship validation.

### Tests for User Story 2 ⚠️

- [ ] T012 [P] [US2] In `tests/int/payments-collection.spec.ts`, add a test asserting that
      `createPayment({ ...baseData(), userId: 999999999 })` (a non-existent user id) rejects.
      Note when running this: because the Foundational phase (T002) already changed `userId`
      to a real relationship, this test is expected to pass immediately once written — there is
      no separate implementation task producing new code for it. Run it anyway and confirm it
      passes for the right reason (a rejection from Payload's relationship-integrity check, not
      a coincidental failure) before treating it as done; this is a guard-rail regression test,
      not a red/green driver for new code.
- [ ] T013 [P] [US2] In the Payments admin edit screen (no code change expected — this is a
      manual verification, not an automated test, since Payload's relationship field UI is
      library behavior), confirm via `pnpm dev` that the "Recorded By" field renders as a
      document picker over `users`, not a free-text/number input.

**Checkpoint**: Both user stories independently verified. FR-002 / SC-002 are satisfied by
the Foundational change; this phase's tests exist so the guarantee has a named place to
break loudly if it ever regresses.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T014 Run `pnpm lint` (eslint + theme-guard) and `pnpm typecheck` — both must be green
      before this is done, per `CLAUDE.md`.
- [ ] T015 Run the full `pnpm test:unit` and `pnpm test:int` suites (not just the files
      touched above) to catch any incidental regression from the rename (e.g. anything else
      importing `Payment.recordedBy` from `payload-types.ts`).
- [ ] T016 Re-check `INVARIANTS.md` per `CLAUDE.md`'s "Invariants are maintained as you go"
      rule: this change touches the generated-file entries (`payload-types.ts`,
      `importMap.js`) already documented there. Confirm no entry needs rewriting and no new
      silently-breaking constraint was uncovered; if one was, add/edit it in the same commit
      that lands this feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately. BLOCKS both user
  stories (T007-T013 all require `userId` to exist as a relationship field).
- **User Story 1 (Phase 3)**: Depends on Phase 2 only. Delivers the MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 2 only — independent of Phase 3, could run
  in parallel with it if staffed separately, since it touches different tests/files
  (`payments-collection.spec.ts` additions vs. `RecorderCell.tsx`/`Payments/index.ts`
  admin config).
- **Polish (Phase 5)**: Depends on both user stories being complete.

### Within Each Phase

- T001 (test) before T002 (implementation) — Foundational.
- T004 (test) before T005-T006 (migration) — Foundational.
- T007 (test) before T008 (implementation) — US1.
- T012 written and confirmed passing before treating US2 as done (no preceding
  implementation task — see T012's note).

### Parallel Opportunities

- T003 (`generate:types`) can run in parallel with writing T004's test, once T002 is
  merged — both only need T002 done, not each other.
- T012 and T013 (US2) can run in parallel with the entirety of Phase 3 (US1) — different
  files, no shared dependency beyond Phase 2.

---

## Parallel Example: Foundational → User Story 1

```bash
# After T002 lands:
Task: "Run pnpm generate:types to regenerate src/payload-types.ts"          # T003
Task: "Write RecorderCell unit test in tests/unit/collections/RecorderCell.spec.tsx"  # T007
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (field + migration).
2. Complete Phase 3: User Story 1 (display).
3. **STOP and VALIDATE**: run `quickstart.md`'s manual check; the admin list now shows
   recorder names/emails. This alone is shippable.
4. Phase 4 (US2) and Phase 5 (Polish) can follow before merge, but the feature is
   demonstrably working after step 3.

### Incremental Delivery

1. Foundational → relationship exists, not yet visible.
2. - User Story 1 → visible in the list (MVP demo-able).
3. - User Story 2 → guarantee is guarded by a regression test.
4. - Polish → lint/typecheck/full suite green, invariants re-checked.
