# Contract: `HeaderAuthControls` + `LogoutCta`

## `HeaderAuthControls`

**File**: `src/components/public/HeaderAuthControls/index.tsx` · `'use client'`

Rendered by `Header/Component.client.tsx` in place of the previous
`<LoginCta /><RegisterCta />` pair.

### Behaviour

| State                                                                          | Renders                       |
| ------------------------------------------------------------------------------ | ----------------------------- |
| `authenticated === null` (server render, first client render, fetch in flight) | `<LoginCta /><RegisterCta />` |
| `authenticated === false` (confirmed, or fetch failed)                         | `<LoginCta /><RegisterCta />` |
| `authenticated === true` (confirmed)                                           | `<LogoutCta />` only          |

- Server render and first client render both produce the `null` branch → hydration-safe,
  no markup mismatch.
- After mount, fires `GET /next/auth-status` exactly once. On `{ authenticated: true }`,
  sets state → `true`. On `{ authenticated: false }` or any fetch/parse error, sets
  state → `false`.
- Exactly one of the two control sets is in the DOM at any time (FR-002).

## `LogoutCta`

**File**: `src/components/public/LogoutCta/index.tsx` · `'use client'`

Sibling of `LoginCta` / `RegisterCta`.

### Behaviour

- Renders a single `Button` (`@/components/public/ui/button`), `size="sm"`,
  `variant="ghost"`, label `Đăng xuất`. No hex / raw colour / palette class (FR-008,
  theme-guard).
- On click: guard on a `pending` flag, set it, `const { redirectTo } = await logoutAction()`,
  `window.location.assign(redirectTo)`; reset `pending` only if the action rejects (research D5).
- While `pending`: `disabled` and `aria-busy={true}`, label `Đang đăng xuất…` — cannot be
  triggered twice (FR-006).
- Full-document navigation via `window.location.assign` (FR-004); no `router.push`, no
  `redirect()` (FR-005).
- Adds no new server behaviour — `logoutAction` is called unchanged (FR-003).

### Not included

- No display of the visitor's name or email (spec Assumptions).
- No "sign out from all devices" (`logoutAllAction`) — FR-007.
