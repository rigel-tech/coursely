# Phase 1 Data Model: Access + Refresh Token Sessions

No new Postgres tables. State is: (1) an in-memory-verifiable access token, (2) a Redis
keyspace for sessions, (3) new `audit-logs.action` values.

---

## 1. Access token (not persisted)

Compact HS256 JWT. Header `{"alg":"HS256","typ":"JWT"}`. Payload claims:

| Claim    | Type                                               | Source                 | Notes                                                                            |
| -------- | -------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `sub`    | number                                             | `user.id`              | Document IDs are numbers here (repo invariant) — never stringify for comparison. |
| `role`   | `'ADMIN' \| 'STUDENT'`                             | `user.role`            | For `decideRoute`.                                                               |
| `status` | `'ACTIVE' \| 'PENDING_VERIFICATION' \| 'DISABLED'` | `user.status`          | Guard admits only `ACTIVE` to the student area.                                  |
| `iat`    | number (s)                                         | now                    |                                                                                  |
| `exp`    | number (s)                                         | `iat + ACCESS_TTL_SEC` | Guard rejects `exp*1000 ≤ Date.now()`.                                           |

Key: `sha256("coursely/access-token\0" + PAYLOAD_SECRET)` (32 bytes, full digest). Verify =
constant-time HMAC compare (mirror `src/lib/auth/verify-token.ts`), then `exp` check, then
`typeof sub === 'number'`. Any failure → `null` → treated as no access token.

---

## 2. Refresh token (only its hash is persisted)

| Property        | Value                                                                           |
| --------------- | ------------------------------------------------------------------------------- |
| Raw form        | `base64url(randomBytes(32))`, held only in the `coursely-refresh` cookie        |
| Stored form     | `sha256(raw)` hex — the key fragment in `refresh:{hash}` / `spent:{hash}`       |
| Cookie flags    | `httpOnly`, `sameSite:'lax'`, `path:'/'`, `secure` in production                |
| Cookie `maxAge` | `REMEMBER_ME_MAX_AGE_SEC` if remembered; **omitted** (session cookie) otherwise |

---

## 3. Redis keyspace

All keys are per-session or per-user; every one carries a TTL so an abandoned session
self-heals (FR-012).

### `session:{sid}` — Hash — the session record (FR-010)

`sid` = `base64url(randomBytes(16))`.

| Field               | Type                | Meaning                                                                |
| ------------------- | ------------------- | ---------------------------------------------------------------------- |
| `userId`            | number-as-string    | account                                                                |
| `lineId`            | string              | session-line id; `= sid` at creation (FR-010 "session line id")        |
| `refreshHash`       | hex string          | current refresh-token hash (rotated in place — FR-013)                 |
| `ip`                | string              | origin address at login                                                |
| `userAgent`         | string              | origin UA at login                                                     |
| `rememberMe`        | `'1' \| '0'`        | chose the long cookie?                                                 |
| `createdAt`         | ISO string          | login moment                                                           |
| `renewedAt`         | ISO string          | last rotation (FR-013)                                                 |
| `expiresAt`         | epoch-second string | rolling idle expiry — `min(now + idleTtl, absoluteExpiresAt)`          |
| `absoluteExpiresAt` | epoch-second string | `createdAt + REFRESH_ABSOLUTE_TTL_SEC`; fixed for the life of the line |

> The two expiry fields are stored as epoch seconds (not ISO) so the renewal path compares
> them numerically without parsing; `createdAt` / `renewedAt` stay ISO for readability.

**Redis TTL**: seconds until `expiresAt`. Reset on every renewal.

`idleTtl` = `REFRESH_IDLE_TTL_SEC` when `rememberMe`, else `REFRESH_NO_REMEMBER_TTL_SEC`.
`absoluteExpiresAt` only meaningful when `rememberMe` (the session cookie dies first
otherwise), but always stored for uniformity.

### `refresh:{hash}` — String — reverse lookup

Value: `sid`. TTL: matches `session:{sid}`. Deleted the instant the token rotates or the
session is revoked. Presence = "this refresh token is current and spendable".

### `spent:{hash}` — String — reuse marker (FR-017)

Value: JSON `{ sid, lineId, userId }`. Written on every rotation for the _old_ hash. TTL =
the old `refresh:{hash}`'s remaining TTL at rotation time (≤ 30 d). Presence when
`refresh:{hash}` is absent = **theft**.

### `race:{sid}` — String — renewal-race recovery (edge case "Renewal race")

Value: JSON `{ accessJwt, refreshRaw }`. Written by the rotation that won `lock:sess:{sid}`.
TTL = `RENEWAL_GRACE_SEC` (10 s). The concurrent loser returns these instead of erroring.

### `lock:sess:{sid}` — String — single-flight

`SET … NX PX REFRESH_LOCK_MS`. Guards the rotation critical section.

### `session:index:{userId}` — Set — per-account active sids (FR-011)

Members: `sid`s. `SADD` on login and on every renewal; `SREM` on `revokeSession`. TTL =
`REFRESH_ABSOLUTE_TTL_SEC`, bumped on each write. Walked by `revokeAllForUser` (FR-015) and
pruned lazily (a `revokeSession` on an already-gone `sid` is a no-op cleanup).

---

## 4. `audit-logs.action` enum (FR-018, FR-019, FR-020)

`src/collections/AuditLogs/index.ts` `options`:

```
['LOGIN_SUCCESS', 'LOGOUT', 'LOGOUT_ALL', 'REFRESH_REUSE']
```

| Value           | Written by                     | `user`   | Carries       |
| --------------- | ------------------------------ | -------- | ------------- |
| `LOGIN_SUCCESS` | `authenticateUser` (unchanged) | required | ip, userAgent |
| `LOGOUT`        | `logoutAction`                 | required | ip, userAgent |
| `LOGOUT_ALL`    | `logoutAllAction`              | required | ip, userAgent |
| `REFRESH_REUSE` | `renewSession` reuse branch    | required | ip, userAgent |

`ip` / `userAgent` are already `required` on the collection; renewal/logout paths read them
from `next/headers` exactly as `loginAction` does. No renewal-success audit row (a routine
renewal is not a security event — consistent with "no notification on login").

May require a generated migration — see plan.md § Migration.

---

## 5. Lifecycle (state of a session line)

```
            login / verify-otp
                   │  createSession
                   ▼
        ┌──────────────────────┐   renew (access expired, refresh valid, lock won)
        │  ACTIVE              │──────────────┐  rotate in place: new hashes,
        │  refresh:{h}→sid     │◀─────────────┘  expiresAt rolled, spent:{oldh} set
        │  session:{sid}       │
        └───────┬────────┬─────┘
   logout /     │        │      refresh presented but only spent:{h} exists
   logout-all   │        │      → REUSE
                ▼        ▼
        ┌──────────────────────┐
        │  REVOKED             │   session:{sid} + refresh:{h} deleted,
        │  (record gone)       │   sid SREM'd from index; audit row written
        └──────────────────────┘   any further renew → refused (FR-016)

  expiresAt reached with no renewal  →  Redis TTL evicts session:{sid} & refresh:{h}
                                        → next renew hits neither → signed out (FR-024)
```
