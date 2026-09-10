/** Tunables for the self-registration + OTP flow (§3.2, §5.1). */

/** Cookie that carries the address being verified from `/register` to `/xac-thuc-otp`. */
export const PENDING_EMAIL_COOKIE = 'pending_email'
export const PENDING_EMAIL_TTL_SEC = 15 * 60

/** `rememberMe` cookie lifetime; without it the refresh cookie is a session cookie. */
export const REMEMBER_ME_MAX_AGE_SEC = 30 * 24 * 60 * 60

/**
 * Payload's JWT cookie. The config sets no `cookiePrefix`, so it is the default
 * `payload`. Since the custom access/refresh scheme shipped, `proxy` reads this
 * **only for `/admin`** (Payload's own native sign-in); the student flow uses
 * `ACCESS_TOKEN_COOKIE` / `REFRESH_TOKEN_COOKIE` below. Must still track the
 * config `cookiePrefix` — see INVARIANTS.
 */
export const AUTH_TOKEN_COOKIE = 'payload-token'

/**
 * The student-session cookies. Both carry a self-contained HS256 JWT — `ACCESS` a
 * ~15-minute one, `REFRESH` one that lasts the session — so `proxy` can verify
 * and renew with no datastore hit. Distinct from `AUTH_TOKEN_COOKIE` so a
 * signed-in admin and a signed-in student can coexist in one browser.
 */
export const ACCESS_TOKEN_COOKIE = 'coursely-access'
export const REFRESH_TOKEN_COOKIE = 'coursely-refresh'

/** How long an access token stays usable — and so how stale its `status` claim can be. */
export const ACCESS_TTL_SEC = 15 * 60

/**
 * Refresh-token lifetime without "remember me". The cookie dies with the browser
 * anyway; this bounds the token itself, which is what makes the session end.
 * With "remember me" the lifetime is `REMEMBER_ME_MAX_AGE_SEC` above.
 */
export const REFRESH_NO_REMEMBER_TTL_SEC = 12 * 60 * 60

/** Route prefixes `proxy` gates behind a signed-in `ACTIVE` account. */
export const PROTECTED_PREFIXES = ['/tai-khoan', '/khoa-hoc-cua-toi'] as const
