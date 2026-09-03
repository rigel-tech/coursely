/** Tunables for the self-registration + OTP flow (§3.2, §5.1). */

/** `registerAction` attempts allowed per IP per window. */
export const REGISTER_RATE_LIMIT = 10
export const REGISTER_RATE_WINDOW_SEC = 60 * 60

/** Cookie that carries the address being verified from `/register` to `/verify-otp`. */
export const PENDING_EMAIL_COOKIE = 'pending_email'
export const PENDING_EMAIL_TTL_SEC = 15 * 60
