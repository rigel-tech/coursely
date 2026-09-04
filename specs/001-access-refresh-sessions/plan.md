# Implementation Plan: Access + Refresh Token Sessions

**Branch**: `feat/redis-register-form` (spec dir `001-access-refresh-sessions`) | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-access-refresh-sessions/spec.md`

## Summary

Replace the single Payload session JWT for the public/student app with a hand-rolled
two-token scheme: a stateless ~15-minute **access token** (HS256, verified in `proxy`
with no datastore hit) plus a rotating opaque **refresh token** whose SHA-256 hash is the
only thing stored, in a Redis session record. `proxy` renews inline when the access token
is expired/absent and a valid refresh token is present. Add `logout` / `logout-all`,
refresh-token reuse detection with session-line revocation, and new audit event types.
Payload's own auth (`payload-token`) is left untouched and continues to guard `/admin`.

Nothing about the credential check itself changes — email+password, rate limits, Payload
lockout, and the `status` branch in `src/services/login.ts` all stay. Only what happens
**after** a successful check changes: mint our tokens instead of using `payload.login`'s.

## Technical Context

**Language/Version**: TypeScript 5.7, Node runtime (Next 16 `proxy` defaults to Node.js).

**Primary Dependencies**: Next 16.3, Payload 3.88, `ioredis` 6, `zod` 4. **No new
dependency** — access-token signing is `node:crypto` HMAC, mirroring the existing
hand-rolled verify in `src/lib/auth/verify-token.ts` and the HMAC in `src/services/otp.ts`.
`jose` is deliberately not added (see research.md D1).

**Storage**: Redis (session records + indexes + reuse markers), reusing the existing
`src/lib/redis.ts` client. Postgres via Payload only for the `audit-logs` rows and the
`users.lastLoginAt` stamp (unchanged from today).

**Testing**: Vitest. `tests/unit/` (crypto round-trips, pure guard logic — no infra),
`tests/int/` (needs Redis + Postgres — session store, updated login/otp/logout actions).

**Target Platform**: Self-hosted Node server (no Vercel config in repo). Consequence:
`proxy` may hold a Redis dependency on the cold-access path; edge deployment of `proxy` is
ruled out, which this project does not use anyway (documented in research.md D6).

**Project Type**: Web app (Payload CMS + Next App Router), single repo.

**Performance Goals**: Valid-access-token requests do **zero** I/O in `proxy` (unchanged).
Renewal path: one Redis `GET` + one `SET NX` lock + one `MULTI` (≈4 ops) once per ~15 min
per active session.

**Constraints**: `proxy` must stay on the Node runtime (already is). Renewal must not
mis-classify a legitimate double-request as theft (spec edge case "Renewal race") — solved
with a single-flight lock + 10 s race-recovery key, not a reuse alarm.

**Scale/Scope**: Small platform; no concurrent-session cap in this feature (spec
assumption). ~10 new/changed source files, ~6 new test files.

## Constitution Check

_GATE: must pass before Phase 0. Re-checked after Phase 1 — still passing._

| Principle / decision                       | Status             | Note                                                                                                                                                                                                                                                             |
| ------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Think before writing                    | PASS               | Assumptions stated in research.md; two product choices taken to the user (absolute cap → 90 d; OTP-verify session → 30 d). No `NEEDS CLARIFICATION` left.                                                                                                        |
| II. Simple first                           | PASS (1 justified) | No `jose`; reuse `payload.login` for the credential machinery; **session line ≡ session record** (in-place rotation, FR-013) so no separate family key. The single-flight lock + `race:{sid}` key is the one added mechanism — justified in Complexity Tracking. |
| III. Change only what was asked            | PASS               | Touched files listed below; every one traces to an FR. No drive-by refactor of `verify-token.ts` (kept for the admin/Payload token).                                                                                                                             |
| IV. Verifiable goals                       | PASS               | SC-001…SC-008 mapped to tests in quickstart.md; each task in the forthcoming tasks.md carries its red-first test.                                                                                                                                                |
| Tests first, observed red (NON-NEGOTIABLE) | PLANNED            | Every task writes its test first, runs it red, then implements. The existing `tests/int/login-action.spec.ts` asserts the old `payload-token` cookie and **will be updated** — that is expected changed-behaviour, not a drive-by.                               |
| pnpm only                                  | PASS               | —                                                                                                                                                                                                                                                                |
| UI colour tokens                           | N/A                | No UI in this feature (logout button wiring, if any, is a later change; not in scope here).                                                                                                                                                                      |
| Spec Kit workflow                          | PASS               | This is `/speckit-plan`; `/speckit-tasks` next.                                                                                                                                                                                                                  |
| Invariants maintained as you go            | PLANNED            | Two entries rewritten in the implementing commit, one added — see "Invariant changes" below.                                                                                                                                                                     |

### Invariant changes (land in the same commit as the code)

1. **Rewrite** `AUTH_TOKEN_COOKIE must equal ${payloadConfig.cookiePrefix}-token`. Today it
   says "`loginAction` writes it and `proxy` reads it". After this change `loginAction` no
   longer writes it; `proxy` reads it **only for `/admin`**. New rule: the constant still
   must match Payload's prefix (Payload/admin still depends on it), but the student flow
   uses `ACCESS_TOKEN_COOKIE` / `REFRESH_TOKEN_COOKIE`, and `proxy` branches per area
   (Q1 → A in the spec).
2. **Widen** `An auth server action that sets a cookie must not redirect() — it returns
redirectTo`. The "Where" list gains `verify-otp.ts` (now issues session cookies +
   `redirectTo`), `logout.ts`, `logout-all.ts`.
3. **Add** _One active session record per session line; rotation is in-place._ Breaks
   silently: a renewal that `create`s a new record instead of `HSET`-ing the existing one
   still works for the happy path, but leaves an orphan record that logout-all must now
   find, and splits the "line" the reuse response is supposed to revoke as a unit.

## Project Structure

### Documentation (this feature)

```text
specs/001-access-refresh-sessions/
├── plan.md              # This file
├── spec.md              # Already written
├── research.md          # Phase 0 — decisions D1…D10
├── data-model.md        # Phase 1 — Redis keyspace + audit enum + token claims
├── contracts/
│   ├── session-store.md # renew/create/revoke/revoke-all/find contracts
│   ├── access-token.md  # sign/verify claim contract
│   └── proxy-guard.md   # request → (headers, Set-Cookie, decision) contract
├── quickstart.md        # Phase 1 — runnable validation per SC
└── checklists/requirements.md  # Already passing
```

### Source code (repository root)

```text
src/
├── lib/
│   ├── constants/auth.ts            # CHANGE: add ACCESS/REFRESH cookie names + TTL constants;
│   │                                #         rewrite the AUTH_TOKEN_COOKIE doc-comment
│   └── auth/
│       ├── verify-token.ts          # UNCHANGED — stays the Payload/admin token verifier
│       ├── access-token.ts          # NEW — verifyAccessToken(jwt) (no I/O, proxy-safe)
│       └── route-guard.ts           # CHANGE: decideRoute learns "admin vs student cookie"
├── services/
│   ├── session-token.ts            # NEW — signAccessToken / generateRefreshToken / hashRefreshToken
│   ├── session-store.ts            # NEW — createSession / renewSession / revokeSession /
│   │                                #        revokeAllForUser / findSessionByRefresh (Redis)
│   ├── login.ts                    # CHANGE: return {user, rememberMe, redirectTo}, not `token`
│   └── verify-registration.ts      # CHANGE: return the verified user on success
├── actions/auth/
│   ├── login.ts                    # CHANGE: createSession + set 2 cookies (was payload-token)
│   ├── verify-otp.ts               # CHANGE: createSession + set 2 cookies + redirectTo
│   ├── logout.ts                   # NEW — logoutAction()
│   └── logout-all.ts               # NEW — logoutAllAction()
├── lib/constants/
│   ├── login-state.ts             # CHANGE: doc-comment only (cookie names)
│   └── verify-otp-state.ts        # CHANGE: add redirectTo
├── collections/AuditLogs/index.ts # CHANGE: action enum += LOGOUT, LOGOUT_ALL, REFRESH_REUSE
└── proxy.ts                        # CHANGE: async; inline renewal; per-area cookie

tests/
├── unit/services/session-token.spec.ts   # NEW
├── unit/lib/access-token.spec.ts         # NEW
├── unit/lib/route-guard.spec.ts          # CHANGE if it exists, else NEW
├── int/session-store.spec.ts             # NEW — create/renew/rotate/reuse/revoke-all
├── int/login-action.spec.ts              # CHANGE — two cookies, no payload-token
├── int/verify-otp-action.spec.ts         # CHANGE — issues a session
├── int/logout-action.spec.ts             # NEW
└── int/logout-all-action.spec.ts         # NEW
```

**Structure Decision**: Existing layout. Domain logic in `src/services/` (pure-ish,
Redis/Payload I/O, no HTTP), HTTP orchestration in `src/actions/auth/`, the route guard
split `proxy.ts` (request plumbing) / `src/lib/auth/` (pure decisions + stateless verify) —
exactly the split already in place for login and OTP.

## Migration

Adding values to the `audit-logs.action` `select` field: `@payloadcms/db-postgres` backs a
`select` with a native pg `enum`, so a new value needs a generated migration. Task list must
include `pnpm payload migrate:create` and committing the file. Verify at implement time
whether the field is stored as `enum` or `varchar` in this project's generated schema; if
`varchar`, no migration is needed.

## Complexity Tracking

| Addition                                                                                                                         | Why needed                                                                                                                                                                                                                                                                                                                          | Simpler alternative — rejected because                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-flight lock `lock:sess:{sid}` (SET NX PX 5000) + `race:{sid}` key caching the winner's new tokens for `RENEWAL_GRACE_SEC` | Spec edge case "Renewal race": two tabs hit an expired access token with the same valid refresh token at once. Without this, the loser's rotation sees the just-spent hash and fires a **false theft alarm** that revokes the live session.                                                                                         | (a) _Plain 401 to the loser_ — the loser then retries with a now-`spent` cookie and gets signed out mid-session; violates SC-002 (invisible renewal). (b) _No rotation, long-lived refresh_ — defeats FR-005/FR-017, the whole feature. (c) _Reuse alarm tolerates a grace window by timestamp_ — still needs the winner's tokens cached for the loser, i.e. the same `race:{sid}` key, with fuzzier logic. |
| `spent:{refreshHash}` reuse marker, TTL = remaining refresh lifetime                                                             | FR-017/FR-018: a stolen refresh token replayed minutes/days after a legitimate rotation must be _recognised_ (not merely unknown) so the session line is revoked and an audit row written. In-place rotation (FR-013) deletes the old hash→sid mapping, so without this marker a replay is indistinguishable from an expired token. | _Keep every historical hash in the session record_ — unbounded growth, and still needs a hash→record reverse lookup, which is what `spent:` is.                                                                                                                                                                                                                                                             |

Everything else (one hash-keyed lookup, one per-user set, HS256 sign mirroring the existing
verify) is the minimum the FRs demand.

## Phase 0 → research.md · Phase 1 → data-model.md, contracts/, quickstart.md

Generated alongside this file.
