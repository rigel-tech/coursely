# Implementation Plan: Login Page Migration

**Branch**: `006-login-page-migration` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-login-page-migration/spec.md`

## Summary

Move sign-in from a header popover (`LoginCta` + `LoginForm` under
`src/components/public/LoginCta/`) to a dedicated page at
`src/app/(frontend)/user/login/`, matching the existing `page.tsx` (server) +
`Form.tsx` (client) pattern already used by `forgot-password`, `reset-password`,
`verify-otp`, and `account`, reached publicly via a `rewrites.ts` entry
(`/dang-nhap` → `/user/login`). The header's sign-in button becomes a `Link`; the
protected-route guard (`route-guard.ts`) redirects a blocked visitor straight to
`/dang-nhap?callbackUrl=<path>` instead of `/?callbackUrl=<path>`, since the popover
that used to live on every page (including home) is going away. The old popover files
are deleted once the page exists — this is direct replacement, not unrelated cleanup.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router

**Primary Dependencies**: React 19 (`useActionState`, unchanged from the current
`LoginForm`), Next's `rewrites()` config (already wired in `rewrites.ts`)

**Storage**: N/A — no data changes; `loginAction`/`authenticateUser` are untouched

**Testing**: Vitest `tests/unit/components` (form behavior, same style as
`login-form.spec.ts` today) and `tests/unit/lib` (`route-guard.spec.ts`'s existing
callbackUrl assertions, updated to the new destination)

**Target Platform**: Web (Next.js)

**Project Type**: Single Next.js web app

**Performance Goals**: N/A

**Constraints**: `RegisterCta` must not change (FR-007); the account-unverified bounce
to `/xac-thuc-otp` is untouched (spec.md Assumptions); `authenticateUser`/`loginAction`
server-side logic is untouched — only where the form lives and where the guard sends
a blocked visitor changes.

**Scale/Scope**: 1 new page + form file pair, 1 deleted component folder (2 files), 1
rewrite entry, 1 header edit, 1 route-guard edit, ~3 test files touched.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **II. Simple first** — reuses the exact page+form file pattern and rewrite
  mechanism already established by four other auth flows; no new abstraction.
  **Pass.**
- **III. Change only what was asked** — `RegisterCta` untouched (explicit
  requirement); deleting `LoginCta/` is direct replacement of the exact thing this
  feature replaces, not unrelated cleanup; `authenticateUser`/`loginAction` internals
  untouched. **Pass.**
- **IV. Drive to verifiable goals** — every FR maps to an acceptance scenario; the
  callbackUrl-preservation requirement (FR-004) gets its own test since it's the one
  requirement with real regression risk. **Pass.**
- No Payload collection/field or theme-token changes anticipated. **N/A.**

No violations. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-login-page-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── contracts/           # Phase 1 output (route + component contract — no data-model.md)
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
rewrites.ts                                          # EDIT — add /dang-nhap entry

src/app/(frontend)/user/login/
├── page.tsx                                          # NEW — server component (metadata + layout)
└── LoginForm.tsx                                      # NEW — moved from LoginCta/, chrome stripped

src/components/public/LoginCta/                        # DELETE (index.tsx + LoginForm.tsx)

src/components/public/HeaderAuthControls/index.tsx     # EDIT — Link instead of <LoginCta />
src/lib/auth/route-guard.ts                             # EDIT — redirect target for protected prefixes

tests/unit/components/login-form.spec.ts                # EDIT — import path, unchanged assertions
tests/unit/components/login-cta.spec.ts                 # DELETE — tests the removed popover
tests/unit/components/header-auth-controls.spec.ts       # EDIT — assert Link, not popover trigger
tests/unit/lib/route-guard.spec.ts                       # EDIT — callbackUrl destination assertions
```

**Structure Decision**: Single Next.js app. The new page follows the exact
`page.tsx` + `Form.tsx` co-location already used by the other four auth flows under
`src/app/(frontend)/user/`; no new top-level directories.

## Complexity Tracking

_No Constitution Check violations — table not applicable._
