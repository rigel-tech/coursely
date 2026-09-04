# Quickstart / Validation: Access + Refresh Token Sessions

How to prove the feature works. Maps each Success Criterion to a runnable check.

## Prerequisites

```bash
docker compose up -d          # Postgres + Redis
pnpm install
pnpm generate:types           # if the audit-logs enum changed
pnpm payload migrate          # if a migration was generated for the enum
```

Env: `PAYLOAD_SECRET`, `REDIS_URL`, `OTP_SECRET` set (see `.env.example`). No new env var.

## Automated gates (must be green)

```bash
pnpm lint                     # eslint + theme-guard
pnpm typecheck
pnpm test:unit                # session-token, access-token, route-guard
pnpm test:int                 # session-store, login/verify-otp/logout actions  (needs Docker)
```

New/changed test files:

| File                                            | Covers                                                                          | SC                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------ |
| `tests/unit/services/session-token.spec.ts`     | sign/verify round-trip, expiry, tamper, domain separation                       | SC-006 (hash-only), FR-002     |
| `tests/unit/lib/access-token.spec.ts`           | `verifyAccessToken` null-paths                                                  | FR-002                         |
| `tests/unit/lib/route-guard.spec.ts`            | `decideRoute` truth table                                                       | FR-021, SC-008                 |
| `tests/int/session-store.spec.ts`               | create / renew / rotate / **reuse** / expiry / absolute cap / revoke-all / find | SC-003…SC-007                  |
| `tests/int/login-action.spec.ts` (updated)      | two cookies issued, no `payload-token`, `rememberMe` → 30 d refresh cookie      | SC-001, FR-001, FR-008         |
| `tests/int/verify-otp-action.spec.ts` (updated) | OTP success issues a 30 d session + `redirectTo`                                | FR-009, D10                    |
| `tests/int/logout-action.spec.ts`               | record gone, cookies cleared, `LOGOUT` row, later renew refused                 | SC-003, FR-014, FR-016, FR-020 |
| `tests/int/logout-all-action.spec.ts`           | every session for the account dies incl. the caller's                           | SC-004, FR-015                 |

## Manual end-to-end (real browser)

```bash
pnpm dev
```

### SC-001 / SC-002 — renewal is invisible past the access-token lifetime

1. Sign in from the header popover **with** "Ghi nhớ đăng nhập". DevTools → Application →
   Cookies: `coursely-access` and `coursely-refresh` present; refresh cookie `Expires` ≈ 30
   days out.
2. Temporarily set `ACCESS_TTL_SEC = 30` (30 s) and restart. Sign in again.
3. Wait 35 s, then navigate to `/khoa-hoc-cua-toi`. Page renders, no sign-in prompt, no
   flash. Cookies: `coursely-access` value changed, `coursely-refresh` value changed
   (rotated). Revert `ACCESS_TTL_SEC`.
4. `redis-cli KEYS 'session:*'` → one record; `HGET session:<sid> renewedAt` is recent.

### SC-003 — sign out from this device

1. Signed in, then trigger `logoutAction` (temporary button on the account page, or call it
   from a form). Both `coursely-*` cookies gone. `redis-cli EXISTS session:<sid>` → 0.
2. Manually re-add the old `coursely-refresh` value as a cookie, load `/tai-khoan` →
   redirected to `/?callbackUrl=/tai-khoan`. `audit-logs` has one `LOGOUT` row for the user.

### SC-004 — sign out everywhere

1. Sign in in Chrome **and** Firefox (same account). `redis-cli SMEMBERS
session:index:<userId>` → two sids.
2. Invoke `logoutAllAction` from Chrome. Both browsers, next protected navigation →
   sign-in. `SMEMBERS session:index:<userId>` → empty / key gone. One `LOGOUT_ALL` audit
   row.

### SC-005 — stolen refresh token detected

1. Sign in. Copy `coursely-refresh` (the "stolen" copy).
2. In the same browser, force a renewal (wait out the short `ACCESS_TTL_SEC`, navigate).
   The browser's cookie rotates.
3. In a REST client, send a request to any protected page with `Cookie:
coursely-refresh=<stolen copy>` and no access cookie → redirected to sign-in (renewal
   refused).
4. The original browser's next protected navigation also lands on sign-in (whole line
   revoked). `audit-logs` has exactly one `REFRESH_REUSE` row for the user with ip + UA.

### SC-006 — raw refresh token never stored

`redis-cli --scan --pattern 'session:*' | while read k; do redis-cli HGET "$k" refreshHash;
done` → only 64-hex-char digests. `redis-cli --scan --pattern 'refresh:*'` → keys are
`refresh:<hex>`, values are sids. No base64url 43-char token anywhere.

### SC-008 — admin sign-in unaffected

In a browser with a signed-in **student**, go to `/admin`, sign in as an admin. Both work;
`payload-token` and `coursely-access` coexist. Student pages still show the student signed
in; `/admin` shows the admin. Neither logout touches the other's cookie.

## Rollback

Feature is additive + three edited files. To revert: restore `src/actions/auth/login.ts`
and `src/proxy.ts` from `main`, drop the new modules, revert the `audit-logs` enum (+ its
migration). The `coursely-*` cookies expire on their own; no data cleanup needed beyond
`redis-cli --scan --pattern 'session:*'` / `refresh:*` / `spent:*` if desired.
