/** Tunables for the self-registration + OTP flow (§3.2, §5.1). */

/** `registerAction` attempts allowed per IP per window. */
export const REGISTER_RATE_LIMIT = 10
export const REGISTER_RATE_WINDOW_SEC = 60 * 60

/** Cookie that carries the address being verified from `/register` to `/xac-thuc-otp`. */
export const PENDING_EMAIL_COOKIE = 'pending_email'
export const PENDING_EMAIL_TTL_SEC = 15 * 60

/** §7 login rate limits. Two axes, one 15-minute fixed window. */
export const LOGIN_RATE_WINDOW_SEC = 15 * 60
export const LOGIN_IP_LIMIT = 20
export const LOGIN_EMAIL_LIMIT = 5

/**
 * Two auth cookies, split by area — a signed-in admin and a signed-in student
 * coexist in one browser, and neither form's token reaches the other's routes.
 * Both carry a Payload session JWT (same secret, same `users_sessions` backing);
 * only the cookie name differs.
 *
 * `AUTH_TOKEN_COOKIE` is Payload's own default (`payload.config.ts` sets no
 * `cookiePrefix`) and the admin panel writes it directly — if a `cookiePrefix` is
 * ever added to the config, update this constant in the same commit.
 * `STUDENT_TOKEN_COOKIE` is written by `loginAction` and read on every non-admin
 * route. `proxy` picks one by path (no `getPayload` there). See INVARIANTS.
 */
export const AUTH_TOKEN_COOKIE = 'payload-token'
export const STUDENT_TOKEN_COOKIE = 'coursely-token'

/**
 * Session lifetime. Mirrors the `tokenExpiration` on the `Users` collection
 * `auth` config — the cookie `maxAge` and the `users_sessions` row expiry both
 * derive from it. One fixed value; there is no "remember me" long/short split.
 */
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7

/** Route prefixes `proxy` gates behind a signed-in `ACTIVE` account. */
export const PROTECTED_PREFIXES = ['/tai-khoan', '/khoa-hoc-cua-toi'] as const
