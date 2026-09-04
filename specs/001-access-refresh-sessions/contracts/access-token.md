# Contract: access-token module

Two call sites, no I/O. Signing in `src/services/session-token.ts`; verification in
`src/lib/auth/access-token.ts` (imported by `proxy` and potentially Server Components).

## `signAccessToken(input): string`

```ts
type AccessTokenInput = { sub: number; role?: string; status?: string }
```

- Produces `base64url(header).base64url(payload).base64url(hmac)`.
- `payload` = `{ ...input, iat, exp: iat + ACCESS_TTL_SEC }`, `iat` in **seconds**.
- Omits `role` / `status` from claims when the input value is `undefined` (never emits
  `"role":null`).
- HMAC-SHA256, key per data-model §1.
- Deterministic given the same `iat` — tests may inject a clock or assert structure.

## `verifyAccessToken(token: string | undefined): AccessClaims | null`

```ts
type AccessClaims = { id: number; role?: string; status?: string }
```

Returns `null` (never throws) when any of:

| Case                                                                | Why                                             |
| ------------------------------------------------------------------- | ----------------------------------------------- |
| `token` is `undefined` / `''`                                       | no cookie                                       |
| not three `.`-separated segments                                    | not a JWT                                       |
| signature length ≠ expected, or `timingSafeEqual` fails             | forged / wrong key                              |
| `payload` segment is not valid base64url JSON                       | tampered                                        |
| `typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()` | expired                                         |
| `typeof claims.sub !== 'number'`                                    | wrong shape (guards the ID-is-number invariant) |

On success: `{ id: claims.sub, role: str(claims.role), status: str(claims.status) }` where
`str` passes through strings and maps anything else to `undefined`.

### Notes

- Mirrors `src/lib/auth/verify-token.ts` structurally; that file is **untouched** and keeps
  verifying Payload's `payload-token` for `/admin`.
- No `nbf`, no `aud`, no `iss` — single issuer, single audience, symmetric key.

## Unit tests (red first)

1. `signAccessToken` → `verifyAccessToken` round-trips `{ id, role, status }`.
2. Expired token (`iat` far in the past via injected clock) → `null`.
3. One flipped character in each of the three segments → `null` (three assertions).
4. A valid **Payload** token (HS256, Payload's key) → `null` here (domain separation).
5. `signAccessToken({ sub: 1 })` with no role/status → claims contain neither key.
6. `verifyAccessToken(undefined)` → `null`.
