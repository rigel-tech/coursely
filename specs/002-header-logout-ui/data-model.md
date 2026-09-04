# Phase 1 Data Model: Header Logout UI

**No persistent data.** No collection, field, migration, or Redis key is added or changed.

## Transient client state (`HeaderAuthControls`)

| Name            | Type              | Meaning                                                                                                                                                             |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authenticated` | `boolean \| null` | `null` = not yet known (server render, first client render, in-flight fetch). `false` = confirmed no active public-site session. `true` = confirmed active session. |

Transitions: `null` → (`GET /next/auth-status` resolves) → `true` \| `false`. On a fetch
error, stays effectively signed-out (treat as `false`). Never persisted; re-derived on
each full page load.

## Endpoint response shape

`GET /next/auth-status` → `200 application/json`

```json
{ "authenticated": true }
```

`authenticated` is `true` iff `verifyAccessToken(coursely-access cookie)` returns a
non-null claims object. No other fields — no user id, role, email, or expiry is exposed.

## Reused, unchanged

- `logoutAction()` — `src/actions/auth/logout.ts`. Returns `{ redirectTo: string }`.
- `verifyAccessToken(token)` — `src/lib/auth/access-token.ts`. Zero-I/O HMAC verify.
- `ACCESS_TOKEN_COOKIE` — `src/lib/constants/auth.ts` (`'coursely-access'`).
