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
 * Custom student-session tokens (§ access+refresh sessions). `ACCESS` is a
 * stateless ~15-minute HS256 JWT verified in `proxy` with no datastore hit;
 * `REFRESH` is an opaque value whose SHA-256 hash keys a Redis session record.
 * Distinct from `AUTH_TOKEN_COOKIE` so a signed-in admin and a signed-in student
 * can coexist in one browser.
 */
export const ACCESS_TOKEN_COOKIE = 'coursely-access'
export const REFRESH_TOKEN_COOKIE = 'coursely-refresh'

/** Access-token lifetime. Bounds how long a revoked session's access token stays usable. */
export const ACCESS_TTL_SEC = 15 * 60

/**
 * Refresh-token lifetimes. With `rememberMe` the session is a rolling
 * `REFRESH_IDLE_TTL_SEC` window from the last renewal, capped by
 * `REFRESH_ABSOLUTE_TTL_SEC` from the session-line's creation. Without it the
 * refresh cookie is a browser-session cookie and the server record self-expires
 * after `REFRESH_NO_REMEMBER_TTL_SEC` of inactivity.
 */
export const REFRESH_IDLE_TTL_SEC = 30 * 24 * 60 * 60
export const REFRESH_ABSOLUTE_TTL_SEC = 90 * 24 * 60 * 60
export const REFRESH_NO_REMEMBER_TTL_SEC = 12 * 60 * 60

/**
 * Renewal concurrency. `REFRESH_LOCK_MS` is the single-flight lock hold on
 * `lock:sess:{sid}`; `RENEWAL_GRACE_SEC` is how long the winner's freshly-minted
 * tokens are cached at `race:{sid}` for a concurrent double-submit to pick up
 * instead of being mistaken for token reuse.
 */
export const REFRESH_LOCK_MS = 5000
export const RENEWAL_GRACE_SEC = 10

/** Route prefixes `proxy` gates behind a signed-in `ACTIVE` account. */
export const PROTECTED_PREFIXES = ['/tai-khoan', '/khoa-hoc-cua-toi'] as const
