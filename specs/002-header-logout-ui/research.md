# Phase 0 Research: Header Logout UI

## D1 — Where the signed-in decision is made

**Decision**: Client-side. A small `GET` route handler reports `{ authenticated }`; a
client component in the header calls it once after hydration.

**Rationale**: `src/app/(frontend)/page.tsx`, `courses/page.tsx`, `posts/page.tsx` set
`export const dynamic = 'force-static'`. Per
`node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`,
`force-static` forces `cookies()`, `headers()`, and `useSearchParams()` to return empty
values (it does **not** error). A Server Component in the header that reads the
proxy-forwarded `x-user-id` would therefore always see `null` on precisely the pages
that render the header — the feature would never activate for a signed-in visitor.

**Alternatives considered**:

- _Header Server Component reads `headers()`_ — silently always signed-out on the static
  pages (above).
- _Drop `force-static` from the three pages_ — makes the header dynamic and the read
  work, but removes static prerender + 600 s ISR from the main marketing/listing pages;
  a rendering-strategy change well outside "the missing header UI". Rejected by the user
  (2026-09-04).
- _Proxy sets a JS-readable hint cookie_ — touches `proxy.ts` / `session-cookies.ts`
  (spec 001 territory) and adds a cookie; contradicts spec SC-005 ("confined to the
  public header UI"). Rejected by the user.

## D2 — Shape and location of the status check

**Decision**: A `GET` route handler at `src/app/(frontend)/next/auth-status/route.ts`
returning `Response.json({ authenticated: boolean })`.

**Rationale**: `src/app/(frontend)/next/` already holds the framework-plumbing route
handlers (`preview`, `exit-preview`, `seed`). Placing it there keeps it out of the
Payload REST namespace (`/api/*`, served by the `(payload)` route group) and out of the
`proxy` matcher's `api/` exclusion, and reads as a status _read_ rather than an RPC. A
route handler that reads `cookies()` is dynamic automatically — no segment config
needed.

**Alternatives considered**:

- _A `'use server'` action_ — spec SC-005 says "no new server action"; an action is
  POST/RPC-shaped and would need a client wrapper to call on mount anyway. A plain `GET`
  is the smaller, more honest primitive for "am I signed in?".
- _Under `/api/...`_ — collides conceptually with Payload's REST API and is excluded
  from `proxy`; more surprising, no benefit.

## D3 — What the endpoint checks

**Decision**: `verifyAccessToken(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value) !== null`.
No Redis, no `renewSession`.

**Rationale**: `proxy` renews the session inline and rewrites a fresh `coursely-access`
cookie on the response of every matched page load — including the one that renders the
header. So by the time the client fires the status fetch (just after hydration) the
access cookie is normally fresh. The only gap: the ~15-minute access token expires while
the visitor sits on a single page without navigating; the button then stays visually
"signed in" until the next navigation, where `proxy` either renews (still signed in) or
clears the cookies and redirects (header re-renders signed out). That staleness is
cosmetic and self-correcting, and not worth a Redis round-trip — or the risk of rotating
a refresh token from a `GET` — on a cosmetic check.

**Alternatives considered**:

- _Call `renewSession` for exactness_ — adds datastore I/O and token rotation to a
  read-only status probe; rejected.

## D4 — Render strategy while the status is unknown

**Decision**: Render the signed-out controls (`<LoginCta/><RegisterCta/>`) on the server
render, the first client render, and whenever the status is not yet known or is
`{authenticated:false}`. Swap to `<LogoutCta/>` only once the fetch confirms
`{authenticated:true}`.

**Rationale**: Server and first-client render are identical (both signed-out controls) →
hydration-safe, no mismatch, the swap happens in an effect. Defaulting to the signed-out
controls rather than a blank spacer is deliberate: almost every header render is for an
anonymous visitor, and blanking the control slot for everyone to spare a rare one-frame
blink for signed-in visitors is the worse trade. This mirrors the existing
"withhold-until-hydrated" pattern in `Header/Component.client.tsx` (`useIsHydrated`),
choosing the common-case default instead of `null`.

**Consequence**: spec SC-003 ("mutually exclusive in 100% of renders") relaxes for a
signed-in visitor to "mutually exclusive from the first post-hydration paint onward" —
recorded as an accepted deviation in quickstart.md.

## D5 — How the logout button invokes the action

**Decision**: A plain `useState` `pending` flag + `await logoutAction()` +
`window.location.assign(redirectTo)`. `pending` is set on click, left set through the
navigation on success, and reset only if the action rejects.

**Rationale**: `logoutAction()` takes no arguments and returns `{ redirectTo }`, so it
does not fit `useActionState`'s `(prevState, formData)` reducer shape. A plain boolean
drives `disabled` / `aria-busy` and the `Đang đăng xuất…` label (FR-006) and gives
predictable control over the failure path (re-enable) vs the success path (stay disabled
while the full document navigates away). The full-document `window.location.assign`
matches `LoginForm` and its module-banner reasoning (the destination must re-read session
state; `/admin` is a separate route tree) — FR-004, FR-005.

**Alternatives considered**:

- _`useTransition`_ — was the first choice, but an async transition callback that
  completes **without scheduling any state update** (the rejection / "no redirect"
  branch) left `isPending` stuck true in React 19 under jsdom, so the button never
  re-enabled after a failed sign-out. A plain flag has no such edge.
- _`<form action={logoutAction}>` + `useFormStatus`_ — works, but adds a form element and
  a child component purely to read pending state.

## D6 — New user-facing strings

**Decision**: Hard-code Vietnamese (`Đăng xuất`, `Đang đăng xuất…`), matching
`LoginCta` / `RegisterCta`.

**Rationale**: The project's i18n position is `[UNDECIDED]` (constitution). Every
existing public string is a hard-coded literal; this feature follows that and does not
pre-empt the decision.
