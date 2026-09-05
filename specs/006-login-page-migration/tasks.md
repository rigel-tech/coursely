---
description: 'Task list for Login Page Migration'
---

# Tasks: Login Page Migration

**Input**: Design documents from `/specs/006-login-page-migration/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/, quickstart.md

**Tests**: Mandatory per `CLAUDE.md` Settled Decisions — required/suggested list put
to the user via `AskUserQuestion` before any test or code is written (T000).

**Organization**: Two user stories from spec.md — US1 (the page itself) and US2 (the
callbackUrl-preserving redirect). US1 is the MVP; US2 is what makes US1 not a
regression for anyone who was relying on the old bounce-to-home-with-popover flow.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — `src/`, `tests/`, root-level `rewrites.ts`.

---

## Phase 0: Test-List Gate

- [x] T000 Present the required/suggested test list via `AskUserQuestion`
      (multi-select) per `CLAUDE.md` Settled Decisions. Required = T001, T002, T004
      (each verifies a distinct behavior-preservation or behavior-change claim with
      real regression risk); Suggested = T003 (the LoginCta-deletion companion test
      is arguably redundant with T001 passing at all, since the import path itself
      proves the move happened — offered as extra confidence, not required).

---

## Phase 1: User Story 1 - Sign in from a dedicated page (Priority: P1) 🎯 MVP

**Goal**: `/dang-nhap` serves a full sign-in page with the exact form behavior the
popover had; the header links to it instead of opening a popover; the popover code is
gone.

**Independent Test**: `quickstart.md` Scenario 1 + Scenario 3.

### Tests for User Story 1 ⚠️

> Write first; run and observe them fail before touching implementation files.

- [x] T001 [P] [US1] [Required] Update `tests/unit/components/login-form.spec.ts`'s
      import to `@/app/(frontend)/user/login/LoginForm` (file doesn't exist yet).
      Every existing assertion stays byte-for-byte — this is the proof the move
      preserves behavior. Run it and confirm it fails (module not found).
- [x] T002 [P] [US1] [Required] Update `tests/unit/components/header-auth-controls.spec.ts`'s
      `signIn()` helper from `screen.queryByRole('button', { name: /đăng nhập/i })` to
      `screen.queryByRole('link', { name: /đăng nhập/i })`; every other assertion in
      the file is unchanged. Run it and confirm it fails against the current
      button-based `LoginCta`.
- [x] T003 [P] [US1] [Suggested] Delete `tests/unit/components/login-cta.spec.ts`
      (tests the popover toggle/click-outside behavior being removed). Since deleting
      a test file can't itself be "observed red," treat this task as done when T006
      (the folder deletion) makes the deleted test's import unresolvable were it still
      present — i.e. do this deletion in the same commit as T006, not before.

### Implementation for User Story 1

- [x] T004 [P] [US1] Add `{ source: '/dang-nhap', destination: '/user/login' }` to
      `rewrites.ts`'s returned array, alongside the existing auth-page entries.
- [x] T005 [US1] Create `src/app/(frontend)/user/login/LoginForm.tsx` by moving
      `src/components/public/LoginCta/LoginForm.tsx` there verbatim (no logic changes
      — see research.md). Create `src/app/(frontend)/user/login/page.tsx` as a server
      component rendering it inside a centered layout with `metadata` (title "Đăng
      nhập | Coursely"), matching `forgot-password/page.tsx`'s shape. Run T001 and
      confirm it now passes.
- [x] T006 [US1] Delete `src/components/public/LoginCta/` (both `index.tsx` and
      `LoginForm.tsx`) now that the page owns the form. Delete
      `tests/unit/components/login-cta.spec.ts` in this same task (completes T003).
- [x] T007 [US1] Edit `src/components/public/HeaderAuthControls/index.tsx`: replace
      `<LoginCta />` with `<Link href="/dang-nhap">Đăng nhập</Link>`, styled to match
      the removed button (see contracts/route-and-redirect.md — same visible label,
      same position next to `RegisterCta`). Remove the now-unused `LoginCta` import.
      Run T002 and confirm it now passes.

**Checkpoint**: `quickstart.md` Scenarios 1 and 3 pass manually; T001/T002 green.

---

## Phase 2: User Story 2 - Reaching sign-in directly when blocked (Priority: P1)

**Goal**: A signed-out visitor blocked from a protected page lands on `/dang-nhap`
with their destination preserved, not on the homepage.

**Independent Test**: `quickstart.md` Scenario 2.

### Tests for User Story 2 ⚠️

- [x] T008 [US2] [Required] Update the two protected-area assertions in
      `tests/unit/lib/route-guard.spec.ts` ("redirects an anonymous visitor... " and
      "redirects a not-yet-verified account...") from
      `to: '/?callbackUrl=...'` to `to: '/dang-nhap?callbackUrl=...'`. Run it and
      confirm it fails against the current `route-guard.ts` (still redirects to `/`).

### Implementation for User Story 2

- [x] T009 [US2] In `src/lib/auth/route-guard.ts`'s protected-prefix branch, change
      the redirect target from `` `/?callbackUrl=${encodeURIComponent(pathname)}` ``
      to `` `/dang-nhap?callbackUrl=${encodeURIComponent(pathname)}` ``. Do **not**
      touch the `/admin` or `/xac-thuc-otp` branches (see research.md). Run T008 and
      confirm it now passes.

**Checkpoint**: Both user stories independently functional; `quickstart.md` Scenario 2
passes manually.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [x] T010 [P] Run `pnpm lint` and `pnpm typecheck` — both green. **Both green**
      (lint: same 12 pre-existing unrelated warnings in `src/migrations/*`;
      typecheck: clean).
- [x] T011 Run `pnpm test:unit` — all green, including every test task above.
      **All tests for this feature pass.** One pre-existing, unrelated failure
      remains (`tests/unit/lib/route-guard.spec.ts`'s `/admin` gate — predates this
      feature, confirmed via `git log`).
- [ ] T012 Walk through `quickstart.md` Scenarios 1, 2, and 3 manually against
      `pnpm dev`. Not run this pass — left for the user to confirm before shipping.

---

## Dependencies & Execution Order

- **Phase 0 (Gate)**: Must complete before any test or implementation task.
- **Phase 1**: T001-T003 (tests) before T004-T007 (implementation). T004 is
  independent of the rest; T005 depends on T001 existing to verify against; T006
  depends on T005 (page must exist before the old folder is safe to delete); T007
  depends on T006 (header should point somewhere real, though technically the
  rewrite in T004 makes the page reachable even before T006 — order given is the
  safest sequence, not a hard technical requirement beyond T005 before T006).
- **Phase 2**: Independent of Phase 1's files (`route-guard.ts` vs. the page/header
  files) — can run in parallel with Phase 1 if desired, though doing Phase 1 first
  means Scenario 2's manual check has a real page to land on.
- **Phase 3**: Depends on both phases being complete.

## Notes

- T003 is the one `[Suggested]` item: deleting a popover-behavior test is only
  meaningfully "red" once the popover it tests is gone (T006), so it can't follow the
  usual write-test-first-and-watch-it-fail shape — offered as a suggested cleanup
  task rather than folded into the required list.
