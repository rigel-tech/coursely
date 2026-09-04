# Contract: proxy route guard (with inline renewal)

`src/proxy.ts` + `src/lib/auth/route-guard.ts`. `proxy` becomes `async`. Node runtime.

## Inputs per request

- `cookies[AUTH_TOKEN_COOKIE]` — Payload `payload-token` (admin flow, unchanged).
- `cookies[ACCESS_TOKEN_COOKIE]` — `coursely-access` (student access token).
- `cookies[REFRESH_TOKEN_COOKIE]` — `coursely-refresh` (student refresh token).
- `cookies[PENDING_EMAIL_COOKIE]` — unchanged, gates `/verify-otp`.
- `nextUrl.pathname`.

## Identity resolution

```
if pathname is under /admin:
    user := verifyAuthToken(payload-token)           // src/lib/auth/verify-token.ts — unchanged
    (no renewal here; admin flow owns its own cookie)
else:
    claims := verifyAccessToken(coursely-access)     // src/lib/auth/access-token.ts
    if claims: user := claims
    else if coursely-refresh present:
        r := await renewSession(coursely-refresh, { ip, userAgent })   // may throw
        if r.ok:
            user := r.user
            renewed := r                              // carry cookies to the response
        else:
            user := null
            clearStudentCookies := true               // stale/again-used/expired
    else:
        user := null
```

`ip` / `userAgent` read from `x-forwarded-for` / `x-real-ip` / `user-agent` exactly as
`loginAction` does today.

**`renewSession` throws (Redis down)** → caught → `user := null`,
`clearStudentCookies := true` (fail closed — spec edge case & Assumptions).

## Routing decision — `decideRoute(pathname, user, hasPendingEmail)`

Unchanged semantics; the only change is that `user` for non-admin routes now comes from the
access/refresh path above.

| Route class                                              | Rule (unchanged)                                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/admin`, `/admin/*`                                     | signed-in non-`ADMIN` → redirect `/`; anonymous → `next` (Payload's own `/admin/login` handles it) |
| `/verify-otp`                                            | `hasPendingEmail` ? `next` : redirect `/`                                                          |
| `PROTECTED_PREFIXES` (`/tai-khoan`, `/khoa-hoc-cua-toi`) | `user?.status === 'ACTIVE'` ? `next` : redirect `/?callbackUrl=<path>`                             |
| everything else                                          | `next`                                                                                             |

## Response construction

1. If `decision.type === 'redirect'` → `NextResponse.redirect`. Still attach
   `Set-Cookie` for `renewed` (a renewal that happened on a request that then redirects for
   another reason must not be lost) and clear cookies if `clearStudentCookies`.
2. Else `NextResponse.next({ request: { headers } })` with `x-user-id` / `x-user-role` /
   `x-user-status` **always deleted first**, then set from `user` when present (unforgeable —
   unchanged rule).
3. On that response:
   - `renewed` → `response.cookies.set(ACCESS_TOKEN_COOKIE, renewed.accessJwt, {...})` and
     `response.cookies.set(REFRESH_TOKEN_COOKIE, renewed.refreshRaw, { ...maxAge? })` with
     the standard flags (`httpOnly`, `sameSite:'lax'`, `path:'/'`, `secure` in prod;
     `maxAge` only when `renewed.refreshCookieMaxAge` is set).
   - `clearStudentCookies` → `response.cookies.delete` both.

## `config.matcher`

Unchanged: `['/((?!_next/static|_next/image|favicon.ico|favicon.svg|api/).*)']`. Note (from
Next 16 docs): server actions POST to their page route, which this matcher covers — but the
logout actions still re-check identity from the refresh cookie and never trust `x-user-*`.

## Tests

- **Unit** `route-guard.spec.ts` — `decideRoute` truth table above (pure, no request). Add
  a case: student route + `user` with `status !== 'ACTIVE'` → redirect with `callbackUrl`.
- **Int** — full `proxy` execution needs a `NextRequest` + Redis; covered indirectly:
  `renewSession` is exhaustively tested in `session-store.spec.ts`, and
  `verifyAccessToken` in its own unit spec. A thin `proxy` smoke test (valid access cookie
  → `x-user-*` set, no Redis call; no cookies → student route redirects) is a _suggested_
  test, not required.
