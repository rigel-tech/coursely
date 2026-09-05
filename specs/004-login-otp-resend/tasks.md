---
description: 'Task list for Login OTP Resend'
---

# Tasks: Login OTP Resend

**Input**: Design documents from `/specs/004-login-otp-resend/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Mandatory per `CLAUDE.md` Settled Decisions ("every test is written first and
observed red") — not optional for this repo. Every implementation task below has a
paired test task that must be run red before it, per the project's non-negotiable rule.
Per the same file's testing bullet, the required/suggested test list is put to the user
via `AskUserQuestion` before any test or code is written — see the gate task T000.

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

## Path Conventions

Single Next.js project — `src/`, `tests/` at repository root (see plan.md → Project
Structure).

---

## Phase 0: Test-List Gate

- [x] T000 Present the required/suggested test list for this feature via
      `AskUserQuestion` (multi-select, required items pre-ticked) per `CLAUDE.md`
      Settled Decisions; do not write any test or implementation code until this
      returns. The required list is exactly the test tasks below marked `[Required]`;
      the suggested list is the tasks marked `[Suggested]`.
      **Result (2026-09-05)**: T001, T003, T004, T005, T007, T008 confirmed. **T009 and
      T010 were explicitly deselected by the user — out of scope for this pass.** The
      session-expired behavior T009 would have tested (FR-005) is still implemented in
      T012 per the contract, just without a dedicated red/green test this round.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: `resendOtp` is the one new primitive both user stories call — it must
exist and be verified before either story's implementation task runs.

**⚠️ CRITICAL**: T002 blocks T005 (US1) and T009 (US2).

- [x] T001 [Required] Write failing test: `resendOtp` returns `{ ok: false, reason:
  'cooldown' }` without touching `otp:verify:{email}` when
      `otp:cooldown:{email}` is set, and `{ ok: true, otp }` (delegating to the
      existing `issueOtp` behavior) when it is not — add to
      `tests/int/otp-store.spec.ts`. Run it and confirm it fails because `resendOtp`
      does not exist yet (red for the right reason — a missing export, not a typo).
- [x] T002 Implement `resendOtp(email)` in `src/services/otp-store.ts` per
      `contracts/resend-otp-service.md`: peek `otp:cooldown:{email}`
      (`redis.get`/`exists`), short-circuit with `{ ok: false, reason: 'cooldown' }`,
      else delegate to `issueOtp` and return `{ ok: true, otp }`. Run T001 and
      confirm it now passes.

**Checkpoint**: `resendOtp` exists and is verified — both user stories can proceed.

---

## Phase 2: User Story 1 - Login bounce sends a fresh code (Priority: P1) 🎯 MVP

**Goal**: A correct login against a `PENDING_VERIFICATION` account issues and emails a
new OTP (respecting the 60s cooldown) before bouncing the user to the verification
screen.

**Independent Test**: Register without verifying, wait past the registration send's
cooldown, log in with the correct password, confirm a new email arrives and its code
verifies — per `quickstart.md` Scenario 1.

### Tests for User Story 1 ⚠️

> Write these first; run and observe them fail before touching `login.ts`.

- [x] T003 [P] [US1] [Required] Write failing test in `tests/int/login-action.spec.ts`
      (or `authenticateUser`'s own spec if login.ts has a dedicated one — check
      existing file first): a login with correct credentials against a
      `PENDING_VERIFICATION` user calls `resendOtp`/issues a new OTP and triggers
      `sendVerifyOtpEmail` (mock/spy the email module, matching how
      `register-action.spec.ts` already asserts `sendVerifyOtpEmail` calls). Confirm
      it fails against current `login.ts` (no such call exists yet).
- [x] T004 [P] [US1] [Required] Write failing test (same file) that pre-arms
      `otp:cooldown:{email}` (simulating a send in the last 60s — e.g. the user just
      registered) then asserts a correct-credentials login does **not** trigger
      `sendVerifyOtpEmail` (FR-002/SC-002). Confirm it fails once T006 exists with a
      naive unconditional send — i.e. write and land this test alongside T003 so both
      are red for the same missing-cooldown-check reason before T006 is implemented.
- [x] T005 [P] [US1] [Required] Write failing test asserting a login with an
      **incorrect** password against a `PENDING_VERIFICATION` account never calls
      `sendVerifyOtpEmail` (FR-002).

### Implementation for User Story 1

- [x] T006 [US1] In `authenticateUser` (`src/services/login.ts`), inside the
      `user.status === 'PENDING_VERIFICATION'` branch (currently around line 86-94),
      call `resendOtp(email)`; on `{ ok: true, otp }` fire
      `void sendVerifyOtpEmail(payload, email, otp).catch(...)` exactly like
      `registerStudent` does (`src/services/register.ts:88-92`) — fire-and-forget, log
      failures via `payload.logger.error`. On `{ ok: false, reason: 'cooldown' }` do
      nothing further. This must run before the `AUTH_022` result is returned, and
      must not run for any other branch (`DISABLED`, `AuthenticationError`, etc. —
      satisfies T005). Run T003, T004, T005 and confirm all pass.

**Checkpoint**: User Story 1 fully functional — a login bounce always leaves a working
code in the user's inbox unless one was already sent in the last 60s.

---

## Phase 3: User Story 2 - Manual resend on the verification screen (Priority: P2)

**Goal**: The existing "Gửi lại mã" button on `/user/verify-otp` actually sends a new
code, with clear sent/cooldown/expired feedback.

**Independent Test**: From the verification screen, click "Gửi lại mã" and confirm a
new email arrives and the button reflects a cooldown; click again immediately and
confirm no second email plus a wait message; clear the pending-email cookie and click
again to confirm the session-expired message — per `quickstart.md` Scenario 2.

### Tests for User Story 2 ⚠️

> Write these first; run and observe them fail before touching `resend-otp.ts` /
> `OtpForm.tsx`.

- [x] T007 [P] [US2] [Required] Write failing test in new file
      `tests/int/resend-otp-action.spec.ts`: with a valid `pending_email` cookie and
      no active cooldown, `resendOtpAction` returns `{ status: 'sent', ... }` and
      triggers `sendVerifyOtpEmail`. Confirm it fails (module doesn't exist yet).
- [x] T008 [P] [US2] [Required] Write failing test (same file): a second call within
      60s returns `{ status: 'cooldown', message: ... }` and does not call
      `sendVerifyOtpEmail` again (FR-004).
- [~] T009 [P] [US2] SKIPPED by user at the T000 gate (2026-09-05) — not written this
  round. Behavior (no cookie → session-expired `error`, nothing sent) is still
  implemented in T012 per FR-005/contract, just unverified by an automated test.
- [~] T010 [P] [US2] SKIPPED by user at the T000 gate (2026-09-05) — not written this
  round. T013 still wires the button per FR-006; only unverified by an automated
  test.

### Implementation for User Story 2

- [x] T011 [P] [US2] Create `src/lib/constants/resend-otp-state.ts` — `ResendOtpState`
      type (`status: 'idle' | 'pending' | 'sent' | 'cooldown' | 'error'`, optional
      `message`) and `initialResendOtpState`, mirroring
      `src/lib/constants/verify-otp-state.ts` (see data-model.md).
- [x] T012 [US2] Create `src/actions/auth/resend-otp.ts` (`'use server'`):
      `resendOtpAction(_prev: ResendOtpState, _formData: FormData): Promise<ResendOtpState>`
      per `contracts/resend-otp-action.md` — read `PENDING_EMAIL_COOKIE`, on missing
      cookie return the session-expired `error` state (reuse the same message string
      `verifyOtpAction` uses for `session_expired`, extracted or duplicated verbatim —
      do not diverge the copy), else call `resendOtp(email)` and map its result to
      `sent` / `cooldown`, catching unexpected errors into the generic `error` message
      matching `verifyOtpAction`'s catch branch. Depends on T002, T011. Run T007, T008
      and confirm both pass.
- [x] T013 [US2] Wire the resend control in
      `src/app/(frontend)/user/verify-otp/OtpForm.tsx`: add a second
      `useActionState(resendOtpAction, initialResendOtpState)`, render the "Gửi lại
      mã" control as its own sibling `<form>` (not nested inside the verify `<form>`)
      with `type="submit"`, disable it while its own `useFormStatus().pending` is
      true, and show `state.message` for `cooldown`/`error` and a brief confirmation
      for `sent` (see contracts/resend-otp-action.md → Consumer contract). No
      automated test gates this task (T010 was skipped) — verify manually via
      quickstart.md Scenario 2.

**Checkpoint**: Both user stories independently functional — login bounce and manual
resend both reliably deliver a working code, respecting one shared 60s cooldown.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T014 [P] Run `pnpm lint` and `pnpm typecheck` — both green before this feature is
      considered done (per `CLAUDE.md`). **Both green** (lint: 0 errors, 12
      pre-existing unrelated warnings in `src/migrations/*`; typecheck: clean).
- [x] T015 Run `pnpm test:unit` and `pnpm test:int` (needs
      `docker compose up -d`) — all green, including every test task above.
      **All tests for this feature pass.** Two pre-existing, unrelated failures
      remain in the full suite (not touched by this feature, confirmed via
      `git log` on those files): `tests/unit/lib/route-guard.spec.ts` (`/admin`
      gate — `decideRoute` has that branch commented out already) and
      `tests/int/auth-status-route.spec.ts` (asserts a stale response shape
      missing a `user` field the route already returns). Flagging per
      Principle III — not fixed here as out of scope.
- [ ] T016 Walk through `quickstart.md` Scenarios 1 and 2 manually against `pnpm dev`.
      Not run this pass — the automated int tests (T003/T004/T005/T007/T008) already
      exercise these exact code paths with a mocked `sendEmail`; left for the user to
      confirm against a real mail sink before shipping.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Gate)**: No dependencies — must complete (user's `AskUserQuestion`
  response) before any test or implementation task.
- **Phase 1 (Foundational)**: Depends on Phase 0 — BLOCKS both user stories (T005,
  T012 both call `resendOtp`).
- **Phase 2 (US1)** and **Phase 3 (US2)**: Both depend on Phase 1 completion; the two
  stories are otherwise independent of each other (US1 touches `login.ts`, US2 touches
  the resend action + `OtpForm.tsx` — no shared files).
- **Phase 4 (Polish)**: Depends on both stories being complete.

### Parallel Opportunities

- T003, T004, T005 (US1 tests) are `[P]` — same file but independent `it()` blocks;
  write together, run together.
- T007, T008, T009 (US2 action tests) are `[P]` similarly; T010 (US2 component test)
  is a different file, fully parallel with those three.
- T011 (`resend-otp-state.ts`) is `[P]` with the US2 test-writing tasks — it's a pure
  type file with no dependency on the tests.
- Once Phase 1 (T001-T002) is done, Phase 2 and Phase 3 can proceed in parallel — they
  touch disjoint files (`login.ts` vs. `resend-otp.ts` + `resend-otp-state.ts` +
  `OtpForm.tsx`).

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. T000 gate → Phase 1 (T001-T002) → Phase 2 (T003-T006).
2. **STOP and VALIDATE**: quickstart.md Scenario 1 passes; T014-T015 green for the
   files touched so far.
3. This alone fixes the bug reported first ("login bounces to OTP screen with no
   email sent").

### Incremental Delivery

1. Foundational → US1 (fixes the login-bounce report) → US2 (fixes the dead resend
   button, reported second) → Polish.
