# Contract: session-store module

`src/services/session-store.ts`. All Redis I/O for sessions. No HTTP — callers own cookies
and `next/headers`. Depends on `src/lib/redis.ts` and `src/services/session-token.ts`.

```ts
type SessionCtx = { ip: string; userAgent: string }
type SessionUser = { id: number; role?: string; status?: string }
type IssuedSession = {
  accessJwt: string
  refreshRaw: string
  rememberMe: boolean
  /** seconds; undefined ⇒ caller sets a session cookie (no maxAge) */
  refreshCookieMaxAge?: number
}
```

---

## `createSession(user, ctx, opts): Promise<IssuedSession>`

`opts: { rememberMe: boolean }`.

1. `sid = base64url(randomBytes(16))`; `refreshRaw = generateRefreshToken()`;
   `hash = hashRefreshToken(refreshRaw)`.
2. `idleTtl = rememberMe ? REFRESH_IDLE_TTL_SEC : REFRESH_NO_REMEMBER_TTL_SEC`.
   `absoluteExpiresAt = now + REFRESH_ABSOLUTE_TTL_SEC`.
   `expiresAt = min(now + idleTtl, absoluteExpiresAt)`.
3. `MULTI`: `HSET session:{sid}` (all fields per data-model §3, `lineId = sid`),
   `EXPIRE session:{sid} ⌈expiresAt-now⌉`, `SET refresh:{hash} sid EX <same>`,
   `SADD session:index:{userId} sid`, `EXPIRE session:index:{userId} REFRESH_ABSOLUTE_TTL_SEC`.
4. `accessJwt = signAccessToken({ sub: user.id, role: user.role, status: user.status })`.
5. Return `{ accessJwt, refreshRaw, rememberMe, refreshCookieMaxAge: rememberMe ? REMEMBER_ME_MAX_AGE_SEC : undefined }`.

**No** audit row here — `authenticateUser` already writes `LOGIN_SUCCESS`, and the OTP
action will write it too when it adopts `createSession` (task detail).

---

## `renewSession(rawRefresh, ctx): Promise<RenewResult>`

```ts
type RenewResult =
  | {
      ok: true
      user: SessionUser
      accessJwt: string
      refreshRaw: string
      rememberMe: boolean
      refreshCookieMaxAge?: number
    }
  | { ok: false; reuse?: true }
```

Algorithm — data-model §3 / research D8. Key points the tests pin:

| Given                                                                               | Then                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| valid current refresh token, lock free                                              | new access + new refresh; `refresh:{old}` gone; `spent:{old}` present; `session:{sid}` `refreshHash`/`renewedAt`/`expiresAt` updated, same `sid` & `lineId`; `race:{sid}` set for 10 s |
| the pre-rotation raw token, presented again after rotation (no race window)         | `{ ok: false, reuse: true }`; `revokeSession(sid)` has run; one `REFRESH_REUSE` audit row                                                                                              |
| a second concurrent call with the _same_ valid token while the first holds the lock | resolves to the **same** new tokens the winner minted (via `race:{sid}`), `ok: true`, **no** audit row                                                                                 |
| refresh token unknown to Redis                                                      | `{ ok: false }` (no `reuse`)                                                                                                                                                           |
| `session:{sid}` exists but `now ≥ expiresAt` or `now ≥ absoluteExpiresAt`           | `{ ok: false }`; record + `refresh:{hash}` cleaned                                                                                                                                     |
| Redis unreachable                                                                   | **throws** (caller in `proxy` catches → signed out)                                                                                                                                    |

`rememberMe` / `refreshCookieMaxAge` in the success result echo the session record so
`proxy` re-issues the cookie with the right lifetime.

---

## `revokeSession(sid): Promise<void>`

`HMGET session:{sid} refreshHash userId` → `MULTI` `DEL session:{sid}`,
`DEL refresh:{refreshHash}`, `SREM session:index:{userId} sid`. Missing `sid` ⇒ no-op.
Idempotent. Does **not** write audit (caller does, with the right action).

## `revokeAllForUser(userId): Promise<number>`

`SMEMBERS session:index:{userId}` → `revokeSession` each → `DEL session:index:{userId}`.
Returns the count revoked (for the caller's log / assertions). Includes the caller's own
session (FR-015 acceptance 3).

## `findSessionByRefresh(rawRefresh): Promise<{ sid: string; userId: number } | null>`

Read-only resolver for the logout actions: `refresh:{hash}` → `sid`, else `spent:{hash}` →
`{ sid, userId }`, else `null`. Never mutates, never throws on a miss.

---

## Integration tests (red first) — `tests/int/session-store.spec.ts`

Needs Redis (`docker compose up -d`). Uses random `userId`s; `afterEach` deletes
`session:*`, `refresh:*`, `spent:*`, `race:*`, `session:index:*` for the ids it used, plus
any `audit-logs` rows.

1. `createSession` writes the record, the `refresh:` lookup, and the index entry; access
   token verifies; not-remembered ⇒ `refreshCookieMaxAge` undefined and 12 h TTL;
   remembered ⇒ 30 d TTL and `maxAge` set.
2. `renewSession` happy path — table row 1 above, asserting every key transition.
3. Reuse — capture `refreshRaw`, renew once, present the captured token again → `reuse:
true`, session gone, exactly one `REFRESH_REUSE` row.
4. Race — `Promise.all` two `renewSession(sameToken)` → both `ok:true`, identical tokens,
   one `spent:` marker, zero audit rows.
5. Expired — force `expiresAt` into the past via `HSET`, renew → `{ ok:false }`.
6. Absolute cap — force `absoluteExpiresAt` past, `expiresAt` future, renew → `{ ok:false }`.
7. `revokeAllForUser` on 3 sessions → all 3 records + lookups gone, index key gone, returns 3.
8. `findSessionByRefresh` resolves a current token, a rotated-away token (via `spent:`), and
   `null` for garbage.
