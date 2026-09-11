/**
 * Refusals the auth flows throw — classes, not error codes and not a result union.
 *
 * They live here rather than beside the service that throws them because they are the
 * contract *between* a service and the action that catches it, and belong to neither.
 * Kept next to the thrower, the catching side has to import a module that loads the
 * Payload config just to name an error, and a unit test that mocks that service loses the
 * classes along with it — so the `instanceof` branches it exercises stop being the ones
 * that ship.
 *
 * Everything here extends Payload's `APIError`, which is what the `instanceof` checks are
 * written against: `payload/dist/errors/APIError.js` carries the deprecation notice saying
 * to compare that way rather than by `err.name`, and a name comparison would keep passing
 * while every branch fell through if a second copy of payload landed in `node_modules`.
 *
 * `message` is user-facing Vietnamese copy, rendered as-is by the form. That is why
 * Payload's own English errors are never re-thrown as one of these — they are either
 * passed through untouched for the caller to translate, or replaced outright.
 */
import { APIError } from 'payload'

/** The password was right, but this account may not sign in — disabled, or locked out. */
export class LoginRefused extends APIError {
  constructor(message: string) {
    super(message, 403)
  }
}

/** The password was right, the address is not verified. Carries what the OTP flow needs. */
export class EmailNotVerified extends APIError {
  constructor(readonly email: string) {
    super('Tài khoản chưa xác minh email.', 403)
  }
}
