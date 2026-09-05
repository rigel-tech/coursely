# Contract: Sign-in Route and Guard Redirect

## Route table

| Public URL                      | Serves                               | Mechanism                                                                             |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `/dang-nhap`                    | Sign-in page                         | New `rewrites.ts` entry → `/user/login`                                               |
| `/dang-nhap?callbackUrl={path}` | Sign-in page, pre-filled destination | Same page; `LoginForm` reads `callbackUrl` from its own query string (unchanged code) |

## `decideRoute` contract change (`src/lib/auth/route-guard.ts`)

| Case                                                                         | Before                                                                      | After                                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Anonymous visitor, protected prefix (`/tai-khoan`, `/khoa-hoc-cua-toi`, ...) | `{ type: 'redirect', to: '/?callbackUrl=' + encodeURIComponent(pathname) }` | `{ type: 'redirect', to: '/dang-nhap?callbackUrl=' + encodeURIComponent(pathname) }`                         |
| Pending (unverified) user, protected prefix                                  | Same shape as above, same change                                            | Same shape as above, same change                                                                             |
| `/admin` gate                                                                | Unchanged                                                                   | Unchanged                                                                                                    |
| `/xac-thuc-otp` gate (missing `pending_email` cookie)                        | Redirects to `/`                                                            | **Unchanged** — different branch, different reason (no pending verification to resume, not "please sign in") |

## `HeaderAuthControls` contract change

| Before                                                  | After                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `<LoginCta />` — a `button` toggling an in-place `Card` | `<Link href="/dang-nhap">Đăng nhập</Link>` — plain navigation |

`RegisterCta` is unchanged in both the before and after state (spec.md FR-007).

## `LoginForm` contract (unchanged)

Every prop, state shape (`LoginState`), and side effect (`redirectTo` navigation via
`window.location.assign`, `callbackUrl` folded from `window.location.search` into the
submitted `FormData`) stays exactly as it is today — only its file path changes, from
`src/components/public/LoginCta/LoginForm.tsx` to
`src/app/(frontend)/user/login/LoginForm.tsx`.
