# Phase 0 Research: Login Page Migration

No `[NEEDS CLARIFICATION]` markers in `spec.md`. This phase pins down the exact
call sites and the one behavior change (`route-guard.ts`'s redirect target) the
popover's removal forces.

## Decision: page + form pair, following the existing auth-page convention exactly

**Decision**: `src/app/(frontend)/user/login/page.tsx` (server component: metadata +
layout wrapper, mirroring `forgot-password/page.tsx`) and
`src/app/(frontend)/user/login/LoginForm.tsx` (the current
`LoginCta/LoginForm.tsx` content, with the popover's own concerns — none, since
`LoginForm` itself never had toggle/click-outside logic; that lived entirely in
`LoginCta/index.tsx` — moved as-is).

**Rationale**: `LoginForm.tsx`'s existing content (fields, `useActionState`,
`redirectTo` navigation effect, `callbackUrl` folding) is already page-appropriate;
only `LoginCta/index.tsx`'s toggle/Card/click-outside chrome is being discarded. This
matches research from the `004`/`005` features: reuse existing patterns verbatim
rather than inventing new ones.

**Alternatives considered**:

- _Keep `LoginForm` name/location, just delete `LoginCta`_ — rejected: every other
  migrated auth flow moved its form component into the page's own folder
  (`ForgotPasswordForm.tsx` lives in `user/forgot-password/`, not in a shared
  `components/public/` folder); consistency with that convention is the point of this
  feature.

## Decision: `/dang-nhap` public address via the existing `rewrites.ts` mechanism

**Decision**: Add `{ source: '/dang-nhap', destination: '/user/login' }` to
`rewrites.ts`.

**Rationale**: Same mechanism already used for `/xac-thuc-otp`, `/quen-mat-khau`,
`/dat-lai-mat-khau`, `/tai-khoan`. "Đăng nhập" (sign in) → `dang-nhap` follows the
same transliteration pattern as the others.

## Decision: `route-guard.ts`'s protected-area redirect moves from `/` to `/dang-nhap`

**Decision**: In `decideRoute`, the protected-prefix branch's
`{ type: 'redirect', to: `/?callbackUrl=${...}` }` becomes
`{ type: 'redirect', to: `/dang-nhap?callbackUrl=${...}` }`. The `/xac-thuc-otp`
branch (separate, cookie-gated) is untouched — it already redirects to `/`, but that
is a _different_ requirement (no pending-email cookie means "there's nothing to
verify, go home"), not the protected-area gate this feature changes.

**Rationale**: This is the one behavior change spec.md's FR-004 requires and calls
out as necessary, not optional — the popover that used to make `/?callbackUrl=X`
work (by always being present in the header, on the homepage included) is gone once
this feature ships. Redirecting straight to the new page keeps the single-attempt
sign-in-and-return flow (SC-002) working.

**Alternatives considered**:

- _Leave the redirect at `/` and rely on the visitor clicking the header's (now a
  Link) sign-in button themselves_ — rejected: doubles the steps to reach a working
  form (land on `/`, notice/click the header link, land on `/dang-nhap`) where today
  it's a single bounce to a visible form; spec.md's SC-002 explicitly rules this out
  ("no added step").

## Decision: the header Link needs no special `callbackUrl` forwarding logic of its own

**Decision**: `HeaderAuthControls`'s sign-in control becomes a plain
`<Link href="/dang-nhap">`, with no query-string logic added to the header component
itself.

**Rationale**: The only place `callbackUrl` ever needs to reach the sign-in page is
the protected-area bounce, and that is now handled entirely by `route-guard.ts`
constructing `/dang-nhap?callbackUrl=X` directly — the visitor arrives on
`/dang-nhap` with the query string already attached, so `LoginForm`'s existing
`window.location.search` read (unchanged, see below) picks it up without the header
needing to know or forward anything. A visitor who manually clicks "Đăng nhập" from
an arbitrary page (no prior redirect, no `callbackUrl` in play) gets exactly today's
behavior too: the popover never forwarded the _current_ page's path as a callback
either — only whatever `callbackUrl` happened to already be in that page's own query
string, which a plain `Link` reaching a page still preserves only if that source page
happened to be `/dang-nhap` itself. This matches current behavior's own scope: it
was never "carry my current page along," only "honor an existing callbackUrl param
already in the address bar."

**Alternatives considered**:

- _Header reads `useSearchParams()` and appends any existing `callbackUrl` to the
  Link's `href`_ — rejected as unnecessary: the only realistic source of a
  `callbackUrl` param is the route-guard bounce, which already lands the visitor
  directly on `/dang-nhap` with it attached; there is no scenario left where a
  `callbackUrl` exists on some _other_ page and needs relaying through the header
  click. Adding this would be speculative generality the request doesn't cover.

## Decision: `LoginForm.tsx` itself needs zero logic changes

**Decision**: Move the file verbatim (no edits to its fields, `useActionState` wiring,
`redirectTo` effect, or `callbackUrl`-folding `submit` function).

**Rationale**: `spec.md` FR-001/FR-002/FR-005 all require _unchanged_ behavior; the
component already reads `callbackUrl` from `window.location.search`, which now simply
means "the sign-in page's own query string" instead of "whatever page the popover
happened to be open on" — the read is identical code, just now always on the correct
page.

## Test-site inventory (what must be updated as a consequence, not new scope)

| File                                                 | Why it's touched                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/components/login-form.spec.ts`           | Import path only — `@/components/public/LoginCta/LoginForm` → `@/app/(frontend)/user/login/LoginForm`. Every existing assertion (redirect on success/AUTH_022, field errors, pending state, callbackUrl folding) stays as-is — proof the move didn't change behavior. |
| `tests/unit/components/login-cta.spec.ts`            | Deleted — it tests the popover chrome (toggle/click-outside) being removed by this feature, not unrelated dead code.                                                                                                                                                  |
| `tests/unit/components/header-auth-controls.spec.ts` | The `signIn()` helper queries `getByRole('button', ...)`; once the control is a `<Link>`, its accessible role is `link`. Updated to match; every other assertion (CTA visibility by auth state) is unaffected.                                                        |
| `tests/unit/lib/route-guard.spec.ts`                 | Two existing assertions hard-code `to: '/?callbackUrl=...'` for the protected-area cases — updated to `/dang-nhap?callbackUrl=...` per the Decision above. The `/admin` and `/xac-thuc-otp` describe blocks are untouched (different branches).                       |
