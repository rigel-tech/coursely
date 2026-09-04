# Implementation Plan: Header Logout UI

**Branch**: `feat/login-email` (spec dir `002-header-logout-ui`; no branch hook configured) | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-header-logout-ui/spec.md`

## Summary

The public site header currently always shows `Đăng nhập` / `Đăng ký`. `logoutAction`
(this device) already exists, is tested, and ends the session server-side — but nothing
in the UI reaches it. This feature adds only the missing header UI: when the visitor has
an active public-site session, the header shows a `Đăng xuất` button that calls the
existing `logoutAction` and performs a full-document navigation to the location it
returns; otherwise it shows the existing sign-in / register controls.

**Key constraint that shapes the approach**: `src/app/(frontend)/page.tsx`,
`courses/page.tsx`, and `posts/page.tsx` set `export const dynamic = 'force-static'`. In
Next 16 `force-static` forces `headers()` and `cookies()` to **return empty values**
(confirmed in `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`).
A Server Component in the header therefore cannot read the proxy-forwarded `x-user-id` on
exactly the pages that host the header. The auth-state decision is made **client-side**:
a small `'use server'`-free `GET` route handler reports `{ authenticated }` by verifying
the `coursely-access` cookie, and a client component in the header calls it once after
hydration to choose which controls to render. (User decision, 2026-09-04.)

## Technical Context

**Language/Version**: TypeScript 5.7, Next 16.3 App Router, React 19.

**Primary Dependencies**: Next 16.3, Payload 3.88. **No new dependency.** Reuses
`verifyAccessToken` (`src/lib/auth/access-token.ts`, zero-I/O HMAC verify) and the
existing `logoutAction` (`src/actions/auth/logout.ts`).

**Storage**: None. The status endpoint does no datastore read (no Redis, no Postgres) —
it only verifies the stateless access-token signature.

**Testing**: Vitest. `tests/unit/` for the two client components (jsdom, mock `fetch`
and the action — mirrors `tests/unit/components/login-form.spec.ts`). `tests/int/` for
the route handler (mock `next/headers` cookie jar, real `signAccessToken` — mirrors
`tests/int/logout-action.spec.ts`).

**Target Platform**: Self-hosted Node server (same as spec 001).

**Project Type**: Web app (Payload CMS + Next App Router), single repo.

**Performance Goals**: One extra `GET /next/auth-status` per full page load, signature
verify only, no I/O. No change to the valid-access-token request path.

**Constraints**:

- Must not break `force-static` on `page.tsx` / `courses` / `posts` — so no
  `headers()` / `cookies()` in any Server Component on the static render path.
- Server/first-client render of the new control must be identical (hydration-safe):
  both render the signed-out controls; the swap to `Đăng xuất` happens in an effect.
- No `redirect()` inside a server action (repo invariant) — the client navigates.

**Scale/Scope**: 3 new source files, 1 changed line-block in `Header/Component.client.tsx`,
3 new test files.

## Constitution Check

_GATE: must pass before Phase 0. Re-checked after Phase 1 — still passing._

| Principle / decision                                       | Status  | Note                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Think before writing                                    | PASS    | The `force-static` / `headers()` trap was found in research and taken to the user before planning; three approaches were presented, user chose the client-check endpoint. No `NEEDS CLARIFICATION` left.                |
| II. Simple first                                           | PASS    | Two small client components + one read-only `GET` handler. No new abstraction, no new dependency, no datastore read. Endpoint verifies the access-token signature only (deliberately not `renewSession` — research D3). |
| III. Change only what was asked                            | PASS    | New: `next/auth-status/route.ts`, `HeaderAuthControls/`, `LogoutCta/`. Changed: two lines in `Header/Component.client.tsx`. `LoginCta` / `RegisterCta` untouched. Every changed line traces to an FR.                   |
| IV. Verifiable goals                                       | PASS    | SC-001…SC-005 and the acceptance scenarios mapped to the three test files in quickstart.md.                                                                                                                             |
| Tests first, observed red (NON-NEGOTIABLE)                 | PLANNED | Each task writes its test, runs it red for the assertion reason, then implements.                                                                                                                                       |
| pnpm only                                                  | PASS    | —                                                                                                                                                                                                                       |
| UI colour from tokens                                      | PASS    | `LogoutCta` renders `@/components/public/ui/button` only — no hex, no raw colour function, no palette class. `theme-guard` in `pnpm lint` enforces.                                                                     |
| Tokens govern public UI only                               | PASS    | All three files render in the public tree; none under `src/app/(payload)/` or `src/components/admin/`.                                                                                                                  |
| UI components are shadcn/ui at `src/components/public/ui/` | PASS    | Button is the only UI primitive used.                                                                                                                                                                                   |
| UI language / i18n `[UNDECIDED]`                           | NOTE    | New strings (`Đăng xuất`, `Đang đăng xuất…`) are hard-coded Vietnamese, consistent with `LoginCta` / `RegisterCta`. This feature does not change the undecided i18n position.                                           |
| Spec Kit workflow                                          | PASS    | This is `/speckit-plan`; `/speckit-tasks` next.                                                                                                                                                                         |
| Invariants maintained as you go                            | PLANNED | One entry to **add** — see below.                                                                                                                                                                                       |
| Comments: three tiers                                      | PLANNED | Module banner on each new file explaining _why_ it exists (the `force-static` constraint); JSDoc on the exported component / handler.                                                                                   |

### Invariant changes (land in the same commit as the code)

1. **Add** — _Auth-dependent public UI resolves signed-in state client-side, never from
   `headers()` in a Server Component._ Breaks silently: `src/app/(frontend)/page.tsx`,
   `courses/`, and `posts/` are `force-static`, which makes `headers()` / `cookies()`
   return empty. A Server Component that reads `x-user-id` there still compiles and
   renders — it just always looks signed-out. New auth-gated header/nav UI must go
   through the `GET /next/auth-status` handler (or an equivalent client-side check),
   not a request-header read on the static path.

No entry is superseded. The existing _"An auth server action that sets a cookie must not
`redirect()` — it returns `redirectTo`"_ entry already lists `logout.ts`; this feature
consumes that contract (client navigates) and does not change it.

## Project Structure

### Documentation (this feature)

```text
specs/002-header-logout-ui/
├── plan.md              # This file
├── spec.md              # Already written
├── research.md          # Phase 0 — decisions D1…D6
├── data-model.md        # Phase 1 — the one transient client state + endpoint response shape
├── contracts/
│   ├── auth-status-endpoint.md   # GET /next/auth-status → { authenticated: boolean }
│   └── header-auth-controls.md   # client component: render contract + LogoutCta behaviour
├── quickstart.md        # Phase 1 — runnable validation per SC / acceptance scenario
└── checklists/requirements.md    # Already passing
```

### Source code (repository root)

```text
src/
├── app/(frontend)/next/auth-status/
│   └── route.ts                          # NEW — GET; verifyAccessToken(coursely-access cookie)
│                                         #        → Response.json({ authenticated: boolean })
├── components/public/
│   ├── HeaderAuthControls/
│   │   └── index.tsx                     # NEW — 'use client'; fetch /next/auth-status once after
│   │                                     #        hydration; authenticated → <LogoutCta/>,
│   │                                     #        otherwise → <LoginCta/><RegisterCta/>
│   └── LogoutCta/
│       └── index.tsx                     # NEW — 'use client'; "Đăng xuất" Button; pending flag
│                                         #        → logoutAction() → window.location.assign(redirectTo);
│                                         #        disabled + "Đang đăng xuất…" while pending
└── Header/
    └── Component.client.tsx              # CHANGE — replace `<LoginCta /><RegisterCta />` with
                                          #          `<HeaderAuthControls />` (+ import swap)

tests/
├── unit/components/logout-cta.spec.ts            # NEW — click → logoutAction called → assign(redirectTo);
│                                                 #        disabled/aria-busy + label while pending
├── unit/components/header-auth-controls.spec.ts  # NEW — default/`{authenticated:false}` → Đăng nhập+Đăng ký,
│                                                 #        no Đăng xuất; `{authenticated:true}` → Đăng xuất only
└── int/auth-status-route.spec.ts                 # NEW — valid signed access cookie → {authenticated:true};
                                                  #        none / expired / tampered → {authenticated:false}
```

**Structure Decision**: Existing layout. The status handler lives under
`src/app/(frontend)/next/` — the established home for framework-plumbing route handlers
(`next/preview`, `next/seed`, `next/exit-preview`) — which keeps it clear of the Payload
REST namespace at `/api/*` and the `proxy` matcher's `api/` exclusion. The two new
components sit beside their siblings `LoginCta` / `RegisterCta` under
`src/components/public/`. Only `Header/Component.client.tsx` changes, by two lines.

## Complexity Tracking

_No constitution violations to justify._ The one non-obvious choice — a separate
`GET /next/auth-status` handler instead of reading identity in the header Server
Component — is forced by `force-static` on the host pages, not chosen for flexibility;
it is documented in research D1–D3 and the invariant addition above.

## Phase 0 → research.md · Phase 1 → data-model.md, contracts/, quickstart.md

Generated alongside this file.
