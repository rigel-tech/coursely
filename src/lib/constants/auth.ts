/** Tunables for the self-registration + OTP flow (§3.2, §5.1). */

/** Cookie that carries the address being verified from `/register` to `/xac-thuc-otp`. */
export const PENDING_EMAIL_COOKIE = 'pending_email'
export const PENDING_EMAIL_TTL_SEC = 15 * 60

/**
 * The student-session cookies. Both carry a self-contained HS256 JWT — `ACCESS` a
 * ~15-minute one, `REFRESH` one that lasts the session — so `proxy` can verify
 * and renew with no datastore hit. Distinct from Payload's own `payload-token` so a
 * signed-in admin and a signed-in student can coexist in one browser.
 */
export const ACCESS_TOKEN_COOKIE = 'coursely-access'
export const REFRESH_TOKEN_COOKIE = 'coursely-refresh'

/** How long an access token stays usable — and so how stale its `status` claim can be. */
export const ACCESS_TTL_SEC = 15 * 60

/**
 * How long a session lasts. One value for everyone: there is no "remember me" to opt
 * into, so nothing varies it. It is both the refresh token's own lifetime and the
 * refresh cookie's `maxAge` — the token has to outlive nothing the cookie does not, or
 * a browser would keep presenting a cookie that can no longer buy an access token.
 */
export const REFRESH_TTL_SEC = 30 * 24 * 60 * 60

/** Route prefixes `proxy` gates behind a signed-in `ACTIVE` account. */
export const PROTECTED_PREFIXES = ['/tai-khoan', '/khoa-hoc-cua-toi'] as const
