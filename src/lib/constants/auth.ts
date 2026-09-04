/** Tunables for the self-registration + OTP flow (§3.2, §5.1). */

/** `registerAction` attempts allowed per IP per window. */
export const REGISTER_RATE_LIMIT = 10
export const REGISTER_RATE_WINDOW_SEC = 60 * 60

/** Cookie that carries the address being verified from `/register` to `/verify-otp`. */
export const PENDING_EMAIL_COOKIE = 'pending_email'
export const PENDING_EMAIL_TTL_SEC = 15 * 60

/** §7 login rate limits. Two axes, one 15-minute fixed window. */
export const LOGIN_RATE_WINDOW_SEC = 15 * 60
export const LOGIN_IP_LIMIT = 20
export const LOGIN_EMAIL_LIMIT = 5

/** `rememberMe` cookie lifetime; without it the JWT cookie is a session cookie. */
export const REMEMBER_ME_MAX_AGE_SEC = 30 * 24 * 60 * 60

/**
 * Payload's JWT cookie. The config sets no `cookiePrefix`, so it is the default
 * `payload`. `loginAction` writes it and `proxy` reads it — see INVARIANTS.
 */
export const AUTH_TOKEN_COOKIE = 'payload-token'

/** Route prefixes `proxy` gates behind a signed-in `ACTIVE` account. */
export const PROTECTED_PREFIXES = ['/tai-khoan', '/khoa-hoc-cua-toi'] as const
