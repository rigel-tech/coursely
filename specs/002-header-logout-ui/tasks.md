---
description: 'Task list for Header Logout UI'
---

# Tasks: Header Logout UI

**Input**: Design documents from `specs/002-header-logout-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the constitution requires every change to ship with tests, each
written first and observed red for its assertion before the code that turns it green.

**Test list settled with the user (2026-09-04 multi-select gate)**:
`tests/int/auth-status-route.spec.ts`, `tests/unit/components/logout-cta.spec.ts`
(happy-path + pending/double-click guard + action-rejects→re-enable),
`tests/unit/components/header-auth-controls.spec.ts`,
`tests/unit/components/header-client.spec.ts` (wiring), and an e2e
`tests/e2e/logout.spec.ts` (full sign-in → header shows `Đăng xuất` → sign-out flow).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: user story the task belongs to (only one here: US1)
- Every task names its exact file path.

## Path Conventions

Existing Next 16 / Payload layout. Public UI under `src/components/public/`, frontend
route handlers under `src/app/(frontend)/next/`, tests under `tests/unit/` and
`tests/int/`.

---

## Phase 1: Setup

**Purpose**: Confirm the ground the feature stands on before writing anything.

- [x] T001 [P] Verify the reused surface exists and nothing generated is affected: `logoutAction` (`src/actions/auth/logout.ts`), `verifyAccessToken` (`src/lib/auth/access-token.ts`), `signAccessToken` + `accessTokenKey` (`src/services/session-token.ts`), and `ACCESS_TOKEN_COOKIE` (`src/lib/constants/auth.ts`) are all exported as the plan assumes. Confirm no new dependency is needed and that no collection, admin component, or env var is introduced — so `pnpm generate:types` and `pnpm generate:importmap` are NOT required for this feature. Record the result in the PR description notes.

**Checkpoint**: Assumptions in plan.md / research.md confirmed against the codebase.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: The status endpoint the header's client control depends on. Blocks US1.

**⚠️ CRITICAL**: US1 wiring and its integration check cannot complete until this exists.

- [x] T002 [P] Write `tests/int/auth-status-route.spec.ts` and run it red — mock the `next/headers` cookie jar the way `tests/int/logout-action.spec.ts` does; mint tokens with the real `signAccessToken` from `src/services/session-token.ts`. Assert: a valid, unexpired `coursely-access` cookie → `GET` handler returns `{ authenticated: true }`; no cookie, an `exp`-in-the-past token, and a token with a flipped signature byte each → `{ authenticated: false }`; the response sets/clears no cookies. The red must be the assertion (handler 404/route-not-found first is fine to iterate past).
- [x] T003 Implement `src/app/(frontend)/next/auth-status/route.ts` — `export async function GET()`: read `ACCESS_TOKEN_COOKIE` from `await cookies()`, call `verifyAccessToken`, return `Response.json({ authenticated: result !== null })`. No datastore call, no cookie mutation. Module banner explains why this endpoint exists (the `force-static` pages blank `headers()`/`cookies()` in Server Components — research D1). JSDoc on `GET`. Make T002 green. Per `contracts/auth-status-endpoint.md`.

**Checkpoint**: `GET /next/auth-status` reports session presence from the access-token signature alone.

---

## Phase 3: User Story 1 — A signed-in visitor signs out from the header (Priority: P1) 🎯 MVP

**Goal**: The header shows `Đăng xuất` when signed in and `Đăng nhập` / `Đăng ký` when
not; `Đăng xuất` calls `logoutAction` and full-document-navigates to its `redirectTo`.

**Independent Test**: quickstart.md "Manual end-to-end" steps 1–6 against `pnpm dev` —
anonymous shows the CTAs; after sign-in the header shows `Đăng xuất`; clicking it ends
the session and lands on `/` anonymous; a protected route then bounces.

### Tests for User Story 1 (write first, observe red)

- [x] T004 [P] [US1] Write `tests/unit/components/logout-cta.spec.ts` and run it red — mirror `tests/unit/components/login-form.spec.ts`: `vi.mock('@/actions/auth/logout')`, `vi.stubGlobal('location', { assign })`. Assert: clicking the `Đăng xuất` button calls `logoutAction`; when it resolves `{ redirectTo: '/' }`, `assign` is called with `'/'`; while the action is pending the button is `disabled`, `aria-busy`, labelled `Đang đăng xuất…`, and a second click does not call `logoutAction` again; when the action **rejects**, the button returns to enabled with the `Đăng xuất` label and `assign` is not called.
- [x] T005 [P] [US1] Write `tests/unit/components/header-auth-controls.spec.ts` and run it red — `vi.stubGlobal('fetch', …)`. Assert: on first render and after `fetch` resolves `{ authenticated: false }` (and after a rejected `fetch`), `Đăng nhập` and `Đăng ký` are present and `Đăng xuất` is absent; after `fetch` resolves `{ authenticated: true }`, `Đăng xuất` is present and `Đăng nhập` / `Đăng ký` are absent; `fetch` is called exactly once with `/next/auth-status`.
- [x] T006 [P] [US1] Write `tests/unit/components/header-client.spec.ts` and run it red — render `HeaderClient` with a minimal `data` global. Mock `@/components/public/HeaderAuthControls` to a sentinel; assert the sentinel is in the DOM and that `LoginCta` / `RegisterCta` are not rendered directly (query for the `Đăng ký` button is null when `HeaderAuthControls` is stubbed). Guards the wiring in T009.

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement `src/components/public/LogoutCta/index.tsx` (`'use client'`) — a single `Button` from `@/components/public/ui/button` (`size="sm"`, `variant="ghost"`, label `Đăng xuất`). A plain `const [pending, setPending] = useState(false)`; on click, guard on `pending`, `setPending(true)`, `await logoutAction()`, `window.location.assign(redirectTo)`; on reject `setPending(false)` (stay disabled through a successful navigation). While `pending`: `disabled`, `aria-busy`, label `Đang đăng xuất…`. No hex / raw colour / palette class. Module banner + JSDoc per the three-tier rule. Makes T004 green. Per `contracts/header-auth-controls.md`. (Not `useTransition` — see research D5.)
- [x] T008 [P] [US1] Implement `src/components/public/HeaderAuthControls/index.tsx` (`'use client'`) — state `authenticated: boolean | null` starting `null`; a mount `useEffect` that does `fetch('/next/auth-status')`, and on success sets `authenticated` to the parsed `authenticated` boolean, on any error sets it `false`. Render: `authenticated === true` → `<LogoutCta />`; otherwise → `<LoginCta /><RegisterCta />`. Server render and first client render both hit the `otherwise` branch (hydration-safe). Module banner explains the client-side check (research D1/D4). Makes T005 green.
- [x] T009 [US1] Wire `src/Header/Component.client.tsx` — replace the `import { LoginCta }` / `import { RegisterCta }` lines with `import { HeaderAuthControls } from '@/components/public/HeaderAuthControls'`, and replace the `<LoginCta />` + `<RegisterCta />` JSX (lines ~40–41) with a single `<HeaderAuthControls />`. No other change to that file. Makes T006 green. Depends on T008.
- [x] T010 [US1] Add the INVARIANTS.md entry from plan.md — _"Auth-dependent public UI resolves signed-in state client-side, never from `headers()` in a Server Component"_ — with the "breaks silently" note (`force-static` on `src/app/(frontend)/page.tsx`, `courses/`, `posts/` blanks `headers()`/`cookies()`; use `GET /next/auth-status`). Land it in the same commit as T003–T009. Match the file's existing entry style.

### End-to-end for User Story 1

- [x] T011 [P] [US1] Add a STUDENT seed path for e2e — give `scripts/seed-e2e-user.ts` an optional 4th arg `role` (default `ADMIN`; when `STUDENT`, create with `status: 'ACTIVE'`), and add `seedStudentUser` / `cleanupStudentUser` + a `testStudent` export to `tests/e2e/helpers/seedUser.ts`. No change to the existing admin seed behaviour.
- [x] T012 [US1] Write `tests/e2e/logout.spec.ts` (Playwright) and run it red — seed a STUDENT; in a fresh context, sign in through the header popover (`Đăng nhập` button → email/password fields → submit), wait for the full-document redirect to `/`; assert the header now shows `Đăng xuất` and no `Đăng nhập` / `Đăng ký`; click `Đăng xuất`; assert the browser lands on `/` and the header shows `Đăng nhập` / `Đăng ký` again; navigate to `/tai-khoan` and assert the URL bounces to `/?callbackUrl=…`. Depends on T007–T009 and T011.

**Checkpoint**: US1 fully functional — header switches on real session state and `Đăng xuất` ends the session.

---

## Phase 4: Polish & Cross-Cutting

- [x] T013 [P] Full gate run: `pnpm lint` → 0 errors (12 pre-existing `src/migrations/*` unused-var warnings) + theme-guard 0 violations. `pnpm typecheck` → clean. `pnpm test:int` → 18 files / 70 tests pass (incl. new `auth-status-route.spec.ts`). `pnpm test:e2e` `logout.spec.ts` → 1 pass. `pnpm test:unit` → new component tests pass (9/9); **4 pre-existing failures unrelated to this feature** remain in `tests/unit/repo/` (`design-staging`, `shape-scale`, `type-scale`) — confirmed failing on a clean tree via `git stash`. No `theme-guard-ignore` added.
- [~] T014 Walk quickstart.md "Manual end-to-end" against a running app. **Automated by `tests/e2e/logout.spec.ts`**: steps 1–6 (anonymous CTAs → sign in → header shows `Đăng xuất` → sign out → back to CTAs → protected route bounces). Step 8 (sign-out while already signed out) is covered by `tests/int/logout-action.spec.ts` ("still clears cookies … when no refresh cookie"). **Still needs a human**: step 7 — a signed-in admin (`/admin`, `payload-token`) and a signed-in student (`coursely-*`) in one browser; clicking the public `Đăng xuất` must leave the admin session intact (SC-004). Architecturally guaranteed by the distinct-cookie invariant (`AUTH_TOKEN_COOKIE` vs `coursely-*`) but not exercised end-to-end here.
- [x] T015 Confirmed: `git diff` shows no content change to `src/payload-types.ts` (the `M` predates this feature) and none to `src/app/(payload)/admin/importMap.js`; no `.env.example` in the repo and no `process.env` read added. The change is confined to the public header UI (SC-005) — note for the PR description.

---

## Dependencies & Execution Order

- **T001** (Setup) — no dependencies.
- **T002 → T003** (Foundational) — T003 needs T002 red first. Blocks T012 and T014.
- **T004, T005, T006** — after T001; independent of each other and of the endpoint (they mock/stub).
- **T007** needs T004 red. **T008** needs T005 red. T007 and T008 are different files → parallel.
- **T009** needs T008 (imports `HeaderAuthControls`); makes T006 green.
- **T010** — anytime after T003 exists; commit together with T003–T009.
- **T011** — independent (e2e seed plumbing); after T001.
- **T012** (e2e spec) needs T007–T009 and T011.
- **T013–T015** — after T009, T010, T012.

### Parallel opportunities

- T004, T005, T006 (three new test files) in parallel.
- T007 and T008 (two new component files) in parallel, once their red tests exist.
- T011 (e2e seed plumbing) in parallel with the component work.

---

## Implementation Strategy

Single user story — this is the whole MVP.

1. T001 — confirm ground.
2. T002 → T003 — stand up the status endpoint (red, then green).
3. T004/T005 red → T006/T007 green → T008 wire → T009 invariant. One commit.
4. T010 gate, T011 manual walk, T012 confirm blast radius. Ship.

---

## Notes

- Every test is written first and run red for its assertion before the implementing code (constitution, NON-NEGOTIABLE).
- `logoutAction` is consumed unchanged — no server behaviour, collection, or env var is added (FR-003, FR-007, SC-005).
- Accepted deviation: SC-003 holds "from first post-hydration paint" for a signed-in visitor (research D4, quickstart "Deviations").
- Commit after Phase 2 and after Phase 3; keep T003–T009 in one commit so the invariant lands with its code.
