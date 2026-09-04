# Phase 0 Research: Access + Refresh Token Sessions

Each entry: **Decision · Rationale · Alternatives rejected**. Numbers the spec left as
ranges (FR-003, FR-008) are pinned here; two product choices were taken to the user.

---

## D1 — Access-token format & signing library

**Decision.** Hand-rolled compact HS256 JWT signed with `node:crypto` `createHmac`. A new
module `src/services/session-token.ts` owns `signAccessToken`; verification lives in
`src/lib/auth/access-token.ts` (proxy-safe, zero I/O) and mirrors the byte-for-byte
structure of the existing `src/lib/auth/verify-token.ts`.

**Rationale.** The repo already hand-rolls HS256 _verification_ (`verify-token.ts`) and
HMAC-SHA256 hashing (`src/services/otp.ts`) with `node:crypto` and no library. Signing is
the symmetric ~15 lines. `proxy` runs on the Node runtime so `node:crypto` is available.
Principle II: no new dependency for something already solved in-tree.

**Alternatives rejected.**

- **`jose`** — adds a dependency; `tests/int/login-action.spec.ts` already documents a
  jsdom realm clash with `jose`'s `instanceof Uint8Array` check that forces
  `@vitest-environment node` on any spec that touches it. Not worth it for one sign call.
- **Payload's `payload.login` token** — that is exactly what the feature removes; its TTL
  is fixed by Payload config and it is the wrong cookie identity (Q1 → A).

---

## D2 — Access-token key derivation (kept distinct from Payload's)

**Decision.** `key = createHash('sha256').update('coursely/access-token\0' + PAYLOAD_SECRET).digest()`
— the full 32-byte digest as the HMAC key. No new env var.

**Rationale.** Reuses the one secret the app already requires. The domain-separation prefix
guarantees a token minted here can never verify as a Payload token or vice-versa, even
though both are HS256 — they use different keys. Rotating `PAYLOAD_SECRET` invalidates all
access tokens immediately (spec edge case "PAYLOAD_SECRET rotated"), and sessions recover on
the next refresh because the refresh token is independent of the secret.

**Alternatives rejected.** A dedicated `ACCESS_TOKEN_SECRET` env var — one more secret to
provision and document for no security gain over domain separation. Reusing Payload's exact
key derivation (`sha256(secret).hex().slice(0,32)`) — would let the two token types be
confused.

---

## D3 — Access-token claims & lifetime

**Decision.** Claims: `sub` (user id — **number**, per the repo ID invariant), `role`,
`status`, `iat`, `exp`. Nothing else. `ACCESS_TTL_SEC = 15 * 60` (FR-003 "approximately 15
minutes").

**Rationale.** FR-002 requires exactly id + role + status, verifiable in isolation. The
session id is **not** put in the access token: `proxy` renewal and both logout actions read
the _refresh_ cookie, so they resolve the session themselves; adding `sid` here would be
unused weight and a second thing to keep in sync. 15 min is the midpoint the spec named and
bounds revocation latency for an already-issued access token (FR-024).

**Alternatives rejected.** Including `sid`/`email` — YAGNI (Principle II). A 5-minute TTL —
triples the renewal rate for no measurable security gain at this scale. A 60-minute TTL —
FR-024 revocation latency becomes an hour.

---

## D4 — Refresh token: shape & at-rest form

**Decision.** 32 bytes from `crypto.randomBytes`, `base64url`-encoded (~43 chars). Stored
form is **plain `sha256(raw)` hex** — no HMAC secret.

**Rationale.** The value is already 256 bits of CSPRNG output, so it has no structure to
brute-force and a precomputation table is infeasible; a fast hash is the OWASP-recommended
at-rest form for opaque session tokens (unlike passwords/OTPs, which are low-entropy and
need a slow/keyed hash — hence `otp.ts` uses HMAC). A Redis dump therefore yields only
hashes (SC-006). Keeping it keyless means one less secret and no dependence on
`PAYLOAD_SECRET` for the refresh half (see D2 recovery behaviour).

**Alternatives rejected.** HMAC-SHA256 with a secret — defensible but buys nothing here
against a uniformly-random 256-bit input, and couples refresh validity to a secret we want
it independent of. A signed JWT refresh token — would be self-validating and defeat
server-side revocation (FR-006, FR-016).

---

## D5 — Lifetimes & "remember me" (FR-008) — **user-confirmed**

**Decision.**

| Constant                      | Value                     | Meaning                                                          |
| ----------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `REFRESH_IDLE_TTL_SEC`        | `30 * 24 * 3600` (30 d)   | rolling window; each renewal resets it                           |
| `REFRESH_ABSOLUTE_TTL_SEC`    | `90 * 24 * 3600` (90 d)   | hard ceiling from session-line creation; renewal past this fails |
| `REFRESH_NO_REMEMBER_TTL_SEC` | `12 * 3600` (12 h)        | server-record TTL when "remember me" was **not** ticked          |
| `REMEMBER_ME_MAX_AGE_SEC`     | existing `30 * 24 * 3600` | reused as the refresh **cookie** `maxAge` when remembered        |

- **Remember me ticked** → refresh cookie `maxAge = REMEMBER_ME_MAX_AGE_SEC`; server record
  `expiresAt = min(now + REFRESH_IDLE_TTL_SEC, absoluteExpiresAt)`; Redis key TTL tracks
  `expiresAt`. `absoluteExpiresAt = createdAt + REFRESH_ABSOLUTE_TTL_SEC`, fixed at login.
- **Not ticked** → refresh cookie is a **session cookie** (no `maxAge`); server record
  `expiresAt = now + REFRESH_NO_REMEMBER_TTL_SEC`, still rolling on renewal but never
  extended past a 12 h idle window and with no absolute cap needed (the cookie dies first).

**Rationale.** Matches the spec's stated model (rolling, capped). 90 d absolute cap chosen
by the user over 180 d / uncapped. 12 h server TTL for the non-remembered case stops an
abandoned-tab session record from lingering for days after the cookie is already gone.

**User decision.** "90 ngày" for the absolute cap.

---

## D6 — Renewal location: inline in `proxy` (FR-023, Q2 → B)

**Decision.** `proxy` becomes `async`. When the access token is absent/expired **and** a
refresh cookie is present, `proxy` calls `renewSession(...)` itself, and on success writes
fresh `Set-Cookie` for both tokens on the response it returns, forwarding `x-user-*` from
the renewed claims. It reads Redis **only** on this path.

**Rationale.** Spec resolved this as Option B. Next 16 `proxy` is Node-runtime by default,
so `ioredis` + `node:crypto` are fine. Valid-access-token requests keep doing zero I/O.

**Consequences / accepted trade-offs.**

- `proxy` now imports `src/lib/redis.ts`. The Next docs warn `proxy` "should not rely on
  shared modules or globals" for CDN deployment — this project self-hosts (no Vercel
  config), so `proxy` runs in-process where the global client is correct. Edge deployment
  of `proxy` is now off the table; documented, not a regression for this repo.
- The Next docs also warn that **server actions post to their own route** and a `proxy`
  matcher can skip them, so auth must be re-checked inside each action. Our `logout` /
  `logout-all` actions read the refresh cookie and the session record directly — they never
  trust `x-user-*`. Noted as a standing rule for future auth actions.
- **Redis down on the renewal path** → `renewSession` throws → `proxy` catches → treat as
  signed out (fail closed, per the spec edge case + Assumptions).

**Alternatives rejected.** A `/api/auth/refresh` endpoint the client calls on 401 (Option
A) — needs client-side interception on every fetch/navigation and a redirect dance;
Option B was chosen in the spec. Per-request session-store check (Option C) — explicitly
not adopted; would put a Redis read on _every_ authenticated request.

---

## D7 — Session line ≡ session record (consequence of FR-013)

**Decision.** No separate "family" Redis key. FR-013 mandates **in-place** rotation (same
`sid`, `HSET` the new hash), so a session line never has more than one live record. The
record stores `lineId` (= `sid` at creation, satisfying FR-010 literally and leaving room
if in-place rotation is ever relaxed). "Revoke the session line" (FR-017) = delete that one
`sid`.

**Rationale.** Principle II. A `session:family:{lineId}` set whose only member is always the
same `sid` is pure ceremony. Reuse detection still works via the `spent:` marker (D8).

**Alternatives rejected.** Maintaining `session:family:{lineId}` as a set — dead weight
under in-place rotation. Creating a new `sid` per rotation (a "chain") — would need the
family set, a per-rotation index write, and makes logout-all walk longer, all to model a
history nothing reads.

---

## D8 — Refresh-token reuse detection (FR-017, FR-018) & the renewal race

**Decision.** Two auxiliary keys around the primary `refresh:{hash} → sid` lookup:

- `spent:{oldHash}` → `{ sid, lineId, userId }`, `TTL = ttl(refresh:{oldHash}) at rotation`
  (i.e. the remaining refresh lifetime, ≤ 30 d). Written on every rotation. **Reuse
  marker.**
- `race:{sid}` → `{ accessJwt, refreshRaw }`, `TTL = RENEWAL_GRACE_SEC` (10 s). Written by
  the rotation winner. **Race-recovery only.**
- `lock:sess:{sid}` → `SET NX PX REFRESH_LOCK_MS` (5000). Single-flight.

**Renewal algorithm** (`renewSession(rawRefresh, ctx)`):

1. `hash = sha256(rawRefresh)`.
2. `sid = GET refresh:{hash}`.
   - **hit** → `SET lock:sess:{sid} … NX PX 5000`.
     - **lock acquired** → load `session:{sid}`; reject if missing, `now ≥ expiresAt`, or
       `now ≥ absoluteExpiresAt`. Mint new access + new refresh. `MULTI`: `DEL
refresh:{hash}`; `SET refresh:{newHash} sid` (EX = new record TTL); `SET
spent:{hash} {sid,lineId,userId}` (EX = old key's remaining TTL); `HSET session:{sid}
refreshHash=newHash renewedAt=now expiresAt=<rolled>`; `EXPIRE session:{sid}
<rolled>`; `SET race:{sid} {tokens} EX 10`; `SADD session:index:{userId} sid`;
       `EXPIRE session:index:{userId} REFRESH_ABSOLUTE_TTL_SEC`. Return the new tokens +
       user.
     - **lock not acquired** → poll `GET race:{sid}` every ~150 ms up to ~3 s. Got it →
       return those tokens (benign double-submit). Timed out → `{ ok: false }`.
   - **miss** → `GET spent:{hash}`.
     - **hit** → **reuse**. `revokeSession(sid)` (D9). `payload.create` an `audit-logs` row
       `action='REFRESH_REUSE', user=userId, ip, userAgent`. Return `{ ok: false, reuse:
true }`.
     - **miss** → unknown or fully expired → `{ ok: false }`.

**Rationale.** The lock makes exactly one concurrent rotation win; the loser rides the
winner's result via `race:{sid}` so SC-002 (invisible renewal) holds even under a tab
storm. A genuinely stolen token replayed _after_ the 10 s race window finds no
`refresh:{hash}` but a live `spent:{hash}` → classified as theft, not "expired". The spec's
own assumption sanctioned "single-flight … not a reuse alarm" for the race.

**Alternatives rejected.** Timestamp-only grace (accept a `spent:` token if `now - spentAt
< grace`) — still needs the winner's tokens for the loser, and widens the window in which a
real theft is silently tolerated. Lua script for atomicity — `MULTI` already gives
all-or-nothing here; a script is more moving parts than the flow needs (same call the
`otp-store` made).

---

## D9 — Sign-out (FR-014, FR-015, FR-016, FR-020)

**Decision.**

- `revokeSession(sid)`: `HGET session:{sid} refreshHash userId` → `MULTI` `DEL session:{sid}`,
  `DEL refresh:{thatHash}`, `SREM session:index:{userId} sid`. `spent:` markers are left to
  expire (harmless — their `sid` is now dead).
- `revokeAllForUser(userId)`: `SMEMBERS session:index:{userId}` → `revokeSession` each →
  `DEL session:index:{userId}`.
- `logoutAction()`: resolve `sid` from the refresh cookie (`refresh:{hash}` or, if already
  rotated-away, `spent:{hash}`), `revokeSession`, `audit-logs` `action='LOGOUT'`, delete
  both cookies, return `{ redirectTo: '/' }` — **no `redirect()`** (invariant).
- `logoutAllAction()`: resolve `userId` from the session record (never from `x-user-*`),
  `revokeAllForUser`, `audit-logs` `action='LOGOUT_ALL'`, delete both cookies, return
  `{ redirectTo: '/' }`.

**Rationale.** FR-016 falls out for free: once `session:{sid}` and `refresh:{hash}` are
gone, step 2 of D8 misses and step 3 misses (no `spent:` for the _current_ hash unless it
had been rotated) → renewal refused. `LOGOUT_ALL` is the spec's "record marked as an
all-session revocation".

**Alternatives rejected.** Trusting `x-user-*` for `logout-all`'s user id — those headers
are set from an access token that may be seconds from expiry or belong to a different
tab/account; the refresh cookie is the authoritative identity for a mutation.

---

## D10 — OTP-verify flow also issues a session (FR-009) — **user-confirmed**

**Decision.** `verifyRegistration` returns the verified user on success. `verifyOtpAction`
then calls the shared `createSession(user, ctx, { rememberMe: true })`, sets both cookies,
and returns `{ status: 'success', redirectTo: '/' }`. `VerifyOtpState` gains `redirectTo`;
`<OtpForm>` navigates from an effect (same pattern as `<RegisterForm>` / `<LoginForm>`).

**Rationale.** FR-009 says "the same two credentials by the same rules". The register form
has no "remember me" control; the user chose to treat a fresh email verification as a
30-day (remembered) session rather than session-only or adding a checkbox.

**User decision.** "30 ngày (như có remember me)".

---

## Pinned constants (all land in `src/lib/constants/auth.ts`)

```ts
export const ACCESS_TTL_SEC = 15 * 60
export const REFRESH_IDLE_TTL_SEC = 30 * 24 * 60 * 60
export const REFRESH_ABSOLUTE_TTL_SEC = 90 * 24 * 60 * 60
export const REFRESH_NO_REMEMBER_TTL_SEC = 12 * 60 * 60
export const RENEWAL_GRACE_SEC = 10
export const REFRESH_LOCK_MS = 5000
export const ACCESS_TOKEN_COOKIE = 'coursely-access'
export const REFRESH_TOKEN_COOKIE = 'coursely-refresh'
// AUTH_TOKEN_COOKIE ('payload-token') stays — now the admin-area cookie only.
```

## Open items for `/speckit-tasks` (not blockers)

- Confirm at implement time whether `audit-logs.action` is a pg `enum` (needs
  `pnpm payload migrate:create`) or `varchar` (no migration) in the generated schema.
- `<OtpForm>` / a header "Sign out" control wiring is UI work; the actions are in scope, the
  buttons can be a follow-up unless the tasks list pulls them in.
