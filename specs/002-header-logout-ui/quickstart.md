# Quickstart: Header Logout UI — validation

## Prerequisites

- `pnpm install`
- For `tests/int`: `docker compose up -d` (Postgres + Redis), then `pnpm test:int`.
- For the manual walk-through: `pnpm dev`, plus a registered, verified account.

## Automated

| Check                     | Command                                                             | Asserts                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component: logout button  | `pnpm test:unit tests/unit/components/logout-cta.spec.ts`           | Click calls `logoutAction`; on resolve, `window.location.assign` is called with the returned `redirectTo`. While pending: button `disabled`, `aria-busy`, label `Đang đăng xuất…`, a second click does not call the action again. |
| Component: control switch | `pnpm test:unit tests/unit/components/header-auth-controls.spec.ts` | Before fetch resolves and on `{authenticated:false}` (and on fetch error): `Đăng nhập` + `Đăng ký` present, `Đăng xuất` absent. On `{authenticated:true}`: `Đăng xuất` present, `Đăng nhập` / `Đăng ký` absent.                   |
| Endpoint                  | `pnpm test:int tests/int/auth-status-route.spec.ts`                 | Valid signed `coursely-access` cookie → `{authenticated:true}`. No cookie / expired token / tampered signature → `{authenticated:false}`. Response sets no cookies.                                                               |
| Full gate                 | `pnpm lint && pnpm typecheck && pnpm test:unit`                     | eslint + theme-guard clean (no raw colour in `LogoutCta`); types pass; unit green.                                                                                                                                                |

## Manual end-to-end (`pnpm dev`)

Maps to spec User Story 1 acceptance scenarios and SC-001…SC-005.

1. **Anonymous** — open `/` logged out. Header shows `Đăng nhập` + `Đăng ký`, no
   `Đăng xuất`. (Scenario 4, SC-003.)
2. **Sign in** — sign in via the header form. After the redirect, `/` reloads; within a
   frame of hydration the header shows `Đăng xuất` and no `Đăng nhập` / `Đăng ký`.
   (Scenario 1; SC-003 relaxed to "post-hydration" per research D4.)
3. **Navigate** — visit `/khoa-hoc` (or any public page). Header still shows `Đăng xuất`.
   (SC-001 — control is on every public page.)
4. **Sign out from a normal page** — click `Đăng xuất`. Button shows `Đang đăng xuất…`
   and is disabled; the browser then lands on `/` as anonymous; header shows
   `Đăng nhập` + `Đăng ký`. (Scenarios 2 & 3.)
5. **Session really ended** — press Back / reload. Still anonymous; visiting a protected
   route (`/tai-khoan`) bounces to `/?callbackUrl=…`. (SC-002.)
6. **Sign out from a protected page** — sign in again, go to `/tai-khoan`, click
   `Đăng xuất` → lands on `/` (home), not back on `/tai-khoan`. (Scenario 5.)
7. **Admin coexistence** — in the same browser, sign into `/admin` (Payload) _and_ the
   public site as a student. Click the public header `Đăng xuất`. Reload `/admin`: the
   admin session is untouched. (SC-004, spec edge case.)
8. **Already signed out elsewhere** — sign in, open a second tab, sign out in tab 2, then
   click `Đăng xuất` in tab 1: it still clears cookies and lands on `/`, no error.
   (Spec edge case — `logoutAction` clears cookies before returning regardless.)

## Deviations from spec

- **SC-003** for a signed-in visitor holds "from the first post-hydration paint", not
  literally every render: the static shell paints the signed-out controls, then swaps.
  Anonymous visitors are unaffected. Rationale in research D4.
