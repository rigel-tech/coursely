# Contract: `GET /next/auth-status`

**File**: `src/app/(frontend)/next/auth-status/route.ts`

**Purpose**: Let a client component in the public header learn whether the current
browser has an active public-site session, without the header depending on
`headers()` / `cookies()` in a Server Component (blanked by `force-static` on the host
pages — see research D1).

## Request

- Method: `GET`
- No query params, no body.
- Reads the `coursely-access` cookie (`ACCESS_TOKEN_COOKIE`) from the request.

## Response

- Always `200`, `Content-Type: application/json`.
- Body: `{ "authenticated": boolean }` — no other fields.
- `authenticated` is `true` **iff** `verifyAccessToken(cookieValue)` returns non-null:
  a well-formed, correctly-signed, unexpired access token whose `sub` is a number.
- Missing cookie, malformed token, bad signature, or expired token → `{ "authenticated": false }`.

## Guarantees

- No datastore access (no Redis, no Postgres). Signature verification only.
- Never mutates state: no cookie is set, cleared, or rotated. Safe to call repeatedly.
- Discloses no identity — not the user id, role, status, or token expiry.
- Dynamic by default (reads `cookies()`); not statically cached.

## Out of scope

- Refresh / renewal. If the access token is expired but a valid `coursely-refresh`
  exists, this endpoint still returns `false`; `proxy` performs the actual renewal on
  the next page navigation. Accepted per research D3.
