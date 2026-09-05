# Contract: `resendOtp` (service function)

Location: `src/services/otp-store.ts` (new export, alongside `issueOtp`/`verifyOtp`).

```text
resendOtp(email: string): Promise<
  | { ok: true; otp: string }
  | { ok: false; reason: 'cooldown' }
>
```

## Behavior

1. Read `otp:cooldown:{email}`. If present, return `{ ok: false, reason: 'cooldown' }`
   — no Redis writes, no email.
2. Otherwise, delegate to the existing `issueOtp(email)` and return
   `{ ok: true, otp }`.

## Callers (both fire-and-forget on the email send, per research.md)

- `authenticateUser` (`src/services/login.ts`), in the `AUTH_022` branch — before
  returning the `AUTH_022` result to `loginAction`.
- `resendOtpAction` (`src/actions/auth/resend-otp.ts`) — see
  `resend-otp-action.md` for the outer contract.

## Explicitly not this function's job

- Does not check account status (PENDING_VERIFICATION vs ACTIVE vs DISABLED) — both
  callers already know the account is in a state where a code makes sense before
  calling this (login only reaches it after `AUTH_022` is decided; the resend action
  relies on the same cookie invariant the verify action already trusts).
- Does not send the email itself — callers still call `sendVerifyOtpEmail` with the
  returned `otp`, matching `registerStudent`'s existing split between issuing and
  sending.
