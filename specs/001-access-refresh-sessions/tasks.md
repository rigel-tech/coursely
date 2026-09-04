---
description: 'Task list — Access + Refresh Token Sessions'
---

# Tasks: Access + Refresh Token Sessions

**Input**: Design documents in `specs/001-access-refresh-sessions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: REQUIRED. The project constitution (CLAUDE.md) makes a test mandatory for every
change with executable behaviour, written first and **observed red** before the code that
satisfies it. At implement start, the required/suggested test lists below go through the
`AskUserQuestion` multi-select gate — no code before that answer.

**Organization**: by user story (spec.md P1–P3). Setup + Foundational are shared blockers.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: different file, no dependency on an incomplete task → parallelizable
- **[Story]**: `[US1]`…`[US5]` on user-story tasks only

## Path conventions

Existing repo layout: domain logic `src/services/`, stateless helpers `src/lib/`, HTTP
orchestration `src/actions/auth/`, route guard `src/proxy.ts` + `src/lib/auth/`, tests split
`tests/unit/` (no infra) / `tests/int/` (Postgres + Redis via `docker compose up -d`).

---

## Phase 1: Setup (shared)

- [x] T001 Add the pinned constants to `src/lib/constants/auth.ts` — `ACCESS_TTL_SEC`, `REFRESH_IDLE_TTL_SEC`, `REFRESH_ABSOLUTE_TTL_SEC`, `REFRESH_NO_REMEMBER_TTL_SEC`, `RENEWAL_GRACE_SEC`, `REFRESH_LOCK_MS`, `ACCESS_TOKEN_COOKIE = 'coursely-access'`, `REFRESH_TOKEN_COOKIE = 'coursely-refresh'` (values per research.md §"Pinned constants"); update the `AUTH_TOKEN_COOKIE` doc-comment to state it is now the **admin-area** cookie only.
- [x] T002 Add `'LOGOUT'`, `'LOGOUT_ALL'`, `'REFRESH_REUSE'` to the `action` field `options` in `src/collections/AuditLogs/index.ts` (keep `'LOGIN_SUCCESS'` first).
- [x] T003 Inspect the generated schema for `audit-logs.action`: if it is a Postgres `enum`, run `pnpm payload migrate:create` and commit the migration file; then run `pnpm generate:types` and confirm the only `src/payload-types.ts` change is the widened `action` union.

**Checkpoint**: constants and the audit enum exist; type generation is clean.

---

## Phase 2: Foundational (blocks every user story)

**⚠️ No user-story work begins until this phase is green.**

- [x] T004 [P] Write `tests/unit/services/session-token.spec.ts` and run it red — cases from `contracts/access-token.md` §"Unit tests": sign→verify round-trip of `{id,role,status}`; expired token (injected clock) → `null`; one flipped char in each of the 3 segments → `null` (×3); a real Payload token → `null` (domain separation); `signAccessToken({sub:1})` emits no `role`/`status` keys; `verifyAccessToken(undefined)` → `null`.
- [x] T005 Implement `src/services/session-token.ts` — `signAccessToken({sub,role?,status?})`, `generateRefreshToken()` (`base64url(randomBytes(32))`), `hashRefreshToken(raw)` (`sha256` hex); HS256 key = `sha256("coursely/access-token\0" + PAYLOAD_SECRET)` full digest; module-banner comment mirroring `src/services/otp.ts`. Make T004 green.
- [x] T006 [P] Write `tests/unit/lib/access-token.spec.ts` and run it red (may share fixtures with T004 but asserts the `verifyAccessToken` null-paths in isolation).
- [x] T007 Implement `src/lib/auth/access-token.ts` — `verifyAccessToken(token): AccessClaims | null`, structurally mirroring `src/lib/auth/verify-token.ts`, zero I/O, `typeof claims.sub === 'number'` guard. Make T006 green. Do **not** touch `verify-token.ts` (still the Payload/admin verifier).
- [x] T008 Write `tests/int/session-store.spec.ts` and run it red — `contracts/session-store.md` cases **1, 2, 5, 6, 7, 8** (create; renew happy-path key transitions; expired `expiresAt`; absolute cap; `revokeAllForUser` on 3 sessions; `findSessionByRefresh` current / rotated-away / garbage). Cases 3 (reuse) and 4 (race) are owned by US4 / US1.
- [x] T009 Implement `src/services/session-store.ts` — `createSession`, `renewSession` (single-flight `lock:sess:{sid}`, `race:{sid}` recovery, `spent:{hash}` reuse branch that calls `revokeSession` + writes a `REFRESH_REUSE` `audit-logs` row via `getPayload`), `revokeSession`, `revokeAllForUser`, `findSessionByRefresh`; Redis keyspace exactly per `data-model.md` §3; module-banner comment mirroring `src/services/otp-store.ts`. Make T008 green (reuse/race stay red until T030/T014).
- [x] T010 Add the INVARIANTS.md entry _"One active session record per session line; rotation is in-place"_ (breaks silently: a renewal that `create`s a fresh record instead of `HSET`-ing leaves an orphan logout-all must find and splits the line the reuse response revokes as a unit). Reference `renewSession` in `src/services/session-store.ts`.

**Checkpoint**: token crypto + session store proven by unit/int tests; ready for stories.

---

## Phase 3: User Story 1 — Stay signed in past the access-token lifetime (Priority: P1) 🎯 MVP

**Goal**: sign-in and OTP-verify issue the `coursely-access` + `coursely-refresh` pair;
`proxy` renews inline and invisibly when the access token is expired/absent and a valid
refresh token is held; renewal is race-safe.

**Independent test**: quickstart.md SC-001 / SC-002 — sign in with "remember me", let a
shortened `ACCESS_TTL_SEC` lapse, navigate to `/khoa-hoc-cua-toi`; page renders with no
prompt and both cookie values have rotated.

- [x] T011 [US1] Update `tests/int/login-action.spec.ts` and run the changed assertions red — expect `coursely-access` and `coursely-refresh` set (not `payload-token`); `rememberMe:'on'` → refresh cookie `maxAge === REMEMBER_ME_MAX_AGE_SEC`; no rememberMe → refresh cookie has no `maxAge`; `LOGIN_SUCCESS` audit row unchanged.
- [x] T012 [US1] Update `src/services/login.ts` — `LoginServiceResult` success becomes `{ ok: true; user: { id; role?; status? }; rememberMe: boolean; redirectTo: string }` (drop `token`). Keep the `payload.login` call and all of its error mapping (`LockedAuth`, `AuthenticationError`), the rate-limit axes, the `status` branch, `lastLoginAt`, and the `LOGIN_SUCCESS` row untouched.
- [x] T013 [US1] Update `src/actions/auth/login.ts` — on `result.ok`, call `createSession(result.user, { ip, userAgent }, { rememberMe: result.rememberMe })`, then `cookies().set` both tokens with `{ httpOnly, sameSite:'lax', path:'/', secure: prod }` plus `maxAge` from the result only when present; keep returning `{ status:'success', redirectTo }` and never `redirect()`. Refresh the `payload-token` mention in the `src/lib/constants/login-state.ts` doc-comment. Make T011 green.
- [x] T014 [P] [US1] Write `tests/int/session-renewal-race.spec.ts` and run it red — `Promise.all([renewSession(t), renewSession(t)])` with one valid token → both `{ ok: true }` with **identical** `accessJwt`/`refreshRaw`, exactly one `spent:{hash}` marker, **zero** audit rows. Then make it green (finishes the `lock:sess` / `race:{sid}` paths in `src/services/session-store.ts` from T009).
- [x] T015 [US1] Update `tests/unit/lib/route-guard.spec.ts` — confirm the existing `decideRoute` truth table still holds with identity now sourced from the access token; add a case if missing: student-area path + `user.status !== 'ACTIVE'` → redirect to `/?callbackUrl=<path>`. Run red only for a genuinely new assertion.
- [x] T016 [US1] Rewrite `src/proxy.ts` — make `proxy` `async`; for `/admin*` resolve identity from `verifyAuthToken(payload-token)` (unchanged path, no renewal); otherwise `verifyAccessToken(coursely-access)`, and on a miss with a `coursely-refresh` cookie present `await renewSession(raw, { ip, userAgent })` inside `try/catch` (throw → `user = null` + clear student cookies = fail closed). Attach `Set-Cookie` for a successful renewal to the response whether it is `redirect` or `next`; delete both student cookies on a failed renewal; keep `x-user-*` always deleted-then-set. Update the module banner. Verify with quickstart SC-001/SC-002 + `pnpm test:unit`.
- [x] T017 [US1] Rewrite the INVARIANTS.md entry _"`AUTH_TOKEN_COOKIE` must equal `${payloadConfig.cookiePrefix}-token`"_ — it still must match Payload's prefix (admin/native flow depends on it), but it is now read by `proxy` **only for `/admin`**; the student flow uses `ACCESS_TOKEN_COOKIE` / `REFRESH_TOKEN_COOKIE` and `proxy` branches per area. Fix the "Where" list (`loginAction` no longer writes it).
- [x] T018 [P] [US1] Update `src/lib/constants/verify-otp-state.ts` — add `redirectTo?: string` to `VerifyOtpState` with a doc-comment noting the action sets session cookies and must not `redirect()`.
- [x] T019 [US1] Update `tests/int/verify-otp-action.spec.ts` and run the new assertions red — on a correct OTP the action sets `coursely-access` + `coursely-refresh` (refresh cookie `maxAge === REMEMBER_ME_MAX_AGE_SEC`, per D10) and returns `{ status:'success', redirectTo:'/' }`; `pending_email` still cleared.
- [x] T020 [US1] Update `src/services/verify-registration.ts` — `VerifyRegistrationResult` success becomes `{ ok: true; user: { id; role?; status? } }`; return the looked-up (or freshly-activated) user on both the already-`ACTIVE` and the just-flipped paths.
- [x] T021 [US1] Update `src/actions/auth/verify-otp.ts` — on `result.ok`, read `ip`/`userAgent` from `next/headers` (as `loginAction` does), call `createSession(result.user, ctx, { rememberMe: true })`, `cookies().set` both tokens, then `cookies().delete(PENDING_EMAIL_COOKIE)` and return `{ status:'success', redirectTo:'/' }`. Make T019 green.
- [x] T022 [US1] Update `src/app/(frontend)/verify-otp/OtpForm.tsx` — replace the inline success `<p>` with a `useEffect` on `state.status === 'success'` that calls `window.location.assign(state.redirectTo ?? '/')` (mirror `<LoginForm>`), so the fresh cookies reach the destination server-side.
- [x] T023 [US1] Extend the INVARIANTS.md entry _"An auth server action that sets a cookie must not `redirect()`"_ "Where" list with `verify-otp.ts` (now issues session cookies + `redirectTo`).

**Checkpoint**: MVP — a user signs in or verifies their email, receives both tokens, and
browses across access-token expiry with silent, race-safe renewal. Admin sign-in untouched.

---

## Phase 4: User Story 2 — Sign out from this device (Priority: P1)

**Goal**: `logoutAction` ends the current session server-side and clears both cookies.

**Independent test**: quickstart SC-003 — after `logoutAction`, the same browser cannot
reach a protected page and a later `renewSession(oldRefresh)` is refused; one `LOGOUT` row.

- [x] T024 [P] [US2] Write `tests/int/logout-action.spec.ts` and run it red — mock `next/headers` cookie jar + request headers as `login-action.spec.ts` does; after `logoutAction()`: `session:{sid}` and `refresh:{hash}` gone, the sid `SREM`'d from `session:index:{userId}`, both `coursely-*` cookies deleted, exactly one `audit-logs` row `action:'LOGOUT'` with `user`/`ip`/`userAgent`, and a follow-up `renewSession(oldRaw)` → `{ ok: false }`.
- [x] T025 [US2] Implement `src/actions/auth/logout.ts` — `'use server'` `logoutAction()`: read `coursely-refresh`, `findSessionByRefresh`, `revokeSession(sid)`, `payload.create` the `LOGOUT` row, `cookies().delete` both tokens, `return { redirectTo: '/' }`; no `redirect()`. Module banner explains why the client navigates. Make T024 green.
- [x] T026 [US2] Add `logout.ts` to the "Where" list of the INVARIANTS.md server-action-no-`redirect()` entry (alongside T023's `verify-otp.ts`).

**Checkpoint**: a device can end its own session; its held credentials are inert afterward.

---

## Phase 5: User Story 3 — Sign out everywhere (Priority: P2)

**Goal**: `logoutAllAction` revokes every session for the account, including the caller's.

**Independent test**: quickstart SC-004 — two browsers signed into one account; invoke from
one; neither can load a protected page or renew; `session:index:{userId}` is gone; one
`LOGOUT_ALL` row.

- [x] T027 [P] [US3] Write `tests/int/logout-all-action.spec.ts` and run it red — `createSession` ×3 for one `userId`; after `logoutAllAction()`: all 3 `session:{sid}` + `refresh:{hash}` gone, `session:index:{userId}` deleted, the invoking session included, exactly one `audit-logs` row `action:'LOGOUT_ALL'` with `user`/`ip`/`userAgent`.
- [x] T028 [US3] Implement `src/actions/auth/logout-all.ts` — `logoutAllAction()`: resolve `userId` from the **session record** via `findSessionByRefresh` (never from `x-user-*`), `revokeAllForUser(userId)`, `payload.create` the `LOGOUT_ALL` row, `cookies().delete` both tokens, `return { redirectTo: '/' }`. Make T027 green.
- [x] T029 [US3] Add `logout-all.ts` to the INVARIANTS.md server-action-no-`redirect()` "Where" list.

**Checkpoint**: a compromised account can be fully signed out in one action.

---

## Phase 6: User Story 4 — Stolen refresh credential detected and neutralised (Priority: P2)

**Goal**: a refresh token replayed after a legitimate rotation is recognised as theft — the
session line is revoked and a `REFRESH_REUSE` audit row is written.

**Independent test**: quickstart SC-005 — capture a refresh token, renew once legitimately,
present the captured copy → refused; both parties signed out; exactly one audit record.

- [x] T030 [P] [US4] Write `tests/int/session-reuse.spec.ts` and run it red — capture `refreshRaw`; `renewSession` once (rotates); `renewSession(capturedRaw)` again → `{ ok: false, reuse: true }`; `session:{sid}` + `refresh:{*}` for that line gone; exactly one `audit-logs` row `action:'REFRESH_REUSE'` with `user`/`ip`/`userAgent`; the legitimate holder's next `renewSession(currentRaw)` also → `{ ok: false }`.
- [x] T031 [US4] Complete/confirm the `spent:{hash}` reuse branch in `src/services/session-store.ts` `renewSession` (revoke the line + write the audit row) so T030 is green. No-op if T009 already fully implemented it — in that case just record that here.
- [x] T032 [US4] Extend `tests/int/session-reuse.spec.ts` (or add `tests/int/proxy-reuse.spec.ts`) — drive `proxy` with a `NextRequest` carrying only a reused `coursely-refresh` cookie on a `PROTECTED_PREFIXES` path → response redirects to `/?callbackUrl=…` and both `coursely-*` cookies are cleared on it.

**Checkpoint**: rotation is backed by reuse-detection; a stolen refresh token is a dead end.

---

## Phase 7: User Story 5 — Audit trail for session lifecycle (Priority: P3)

**Goal**: one distinct, attributable `audit-logs` row per session-lifecycle event.

**Independent test**: quickstart SC-007 — perform sign-in, sign-out, sign-out-everywhere,
and a reuse detection; read the log; one row per event, each carrying `user`, and
sign-in / sign-out / reuse also carrying `ip` + `userAgent`.

- [x] T033 [P] [US5] Write `tests/int/audit-session-lifecycle.spec.ts` — run `loginAction` → `logoutAction` → (new session) `logoutAllAction` → (new session) reuse via `renewSession`, each with distinct mocked `ip`/`userAgent`; assert exactly one row for each of `LOGIN_SUCCESS`, `LOGOUT`, `LOGOUT_ALL`, `REFRESH_REUSE`, every row has `user`, and the three security events carry the matching `ip`/`userAgent`. This is a coverage test over behaviour already built in US1–US4; expect it green on first run once those phases are done, red before.

**Checkpoint**: support/incident review can reconstruct every session event.

---

## Phase 8: Polish & cross-cutting

- [x] T034 [P] Run the full gate: `pnpm lint` (eslint + theme-guard), `pnpm typecheck`, `pnpm test:unit`, `pnpm test:int` (Docker up) — all green.
- [x] T035 [P] Re-run `pnpm generate:types` and confirm `src/payload-types.ts` carries only the `audit-logs.action` union widening from T002/T003.
- [x] T036 Walk quickstart.md "Manual end-to-end" SC-001…SC-008 against `pnpm dev`, including the SC-008 admin-coexistence check (a signed-in student and a signed-in admin in one browser, neither logout touching the other's cookie).
- [x] T037 [P] Confirm no new env var was introduced (design uses `PAYLOAD_SECRET` only); if that held, add nothing to `.env.example` and note it in the PR description.

---

## Dependencies & execution order

- **Setup (P1)** → **Foundational (P2)** → user stories → **Polish (P8)**.
- **US1** depends on Foundational (T005, T007, T009). Its OTP sub-thread (T018–T023) is
  independent of its login sub-thread (T011–T017) and the two can run in parallel.
- **US2** and **US3** depend only on Foundational (`findSessionByRefresh`, `revokeSession`,
  `revokeAllForUser`, the audit enum) — they can start **in parallel with US1**. They only
  need US1 for the manual quickstart checks, not for their unit/int tests.
- **US4** depends on Foundational (the reuse branch lives in `session-store.ts`); T032
  additionally wants US1's rewritten `proxy.ts`.
- **US5** is a coverage test over US1–US4 — it goes last among the stories.
- Within a story: the red test task precedes its implementation task (constitution).

### Shared-file caution (do sequentially, not `[P]`)

- `INVARIANTS.md` — T010, T017, T023, T026, T029 all edit it. Serialize.
- `src/services/session-store.ts` — T009, T014, T031. Serialize.
- `src/lib/constants/auth.ts` — T001 only.

## Parallel opportunities

- Foundational: T004 ∥ T006 (distinct unit specs). T005 unblocks after T004; T007 after T006.
- US1: {T011→T012→T013} ∥ {T018, T019→T020→T021→T022}. T014 ∥ once T009 exists.
- Across stories after Foundational: US1 ∥ US2 ∥ US3 (different action files, different
  specs). US4's T030 ∥ too.
- Polish: T034 ∥ T035 ∥ T037.

## Implementation strategy

**MVP = Phases 1–3 (Setup + Foundational + US1).** At the US1 checkpoint the product
already delivers the spec's core defect fix: "remember me" that actually lasts, via silent
renewal. Stop there, run quickstart SC-001/SC-002/SC-008, demo.

Then layer US2 → US3 → US4 → US5, each its own commit(s), each independently testable, none
regressing the last. US2 and US3 can be picked up in parallel with US1 if capacity exists.

---

## Implementation notes / deviations (filled in during `/speckit-implement`)

- **T003 — no migration.** `@payloadcms/db-postgres` runs in `push` mode (no
  `migrationDir`), so adding the three `audit-logs.action` enum values auto-applies on
  `getPayload`. One-time `ALTER TYPE … ADD VALUE` race between parallel test workers on the
  first run resolved itself; the values are persisted. `src/payload-types.ts` diff is the
  union widening only.
- **Access-token key.** `accessTokenKey()` lives in `src/services/session-token.ts` and is
  imported by `src/lib/auth/access-token.ts` — one derivation, not two copies. Both files
  from the plan still exist.
- **New file `src/lib/auth/session-cookies.ts`** (`setSessionCookies` / `clearSessionCookies`).
  The `coursely-access` / `coursely-refresh` pair is written/cleared from five call sites
  (login, verify-otp, logout, logout-all, `proxy`); one structural `CookieSetter` helper
  keeps the flags identical across the `cookies()` jar and `NextResponse.cookies`.
- **Session record `expiresAt` / `absoluteExpiresAt` are epoch-second strings**, not ISO
  (data-model.md §3 said ISO). Numeric compare on the renewal hot path; `createdAt` /
  `renewedAt` stay ISO for `redis-cli` readability.
- **Renewal grace window in tests.** `session-reuse` and `proxy-session` specs `DEL
race:{sid}` to fast-forward past `RENEWAL_GRACE_SEC` so a replay is deterministically
  classed as theft rather than a concurrent double-submit.
- **`vitest.config.mts`** gained `hookTimeout: 60_000` / `testTimeout: 20_000` — the int
  suite spins up Payload per file and drives real Postgres/Redis; under the added parallel
  load the 5s/10s defaults were flaky (schema push, 12-write rate-limit test).
- **Account-disabled-mid-session is out of scope** (as flagged in research D5/D7): renewal
  is Redis-only and reuses the record's `role`/`status`. A Users `afterChange` hook calling
  `revokeAllForUser` on a status flip to `DISABLED` is the clean follow-up.
- **T036 manual walk** (quickstart SC-001…008 in a real browser) is left for the user via
  `pnpm dev`; the automated int suite + production build cover login→renew→reuse→logout,
  the audit trail, and the untouched `/admin` branch.
