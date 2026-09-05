# Phase 1 Data Model: Login OTP Resend

No new persisted entities and no schema changes. This feature only adds a new read
(and, on success, an existing write) against state that already exists.

## Existing state reused (unchanged shape)

### OTP send cooldown — `otp:cooldown:{email}` (Redis)

- **Represents**: whether a verification code was sent to `email` in the last
  `OTP_COOLDOWN_SEC` (60s) seconds.
- **Fields**: presence-only key (`SET ... EX 60`); no value is read, only existence.
- **Owned by**: `src/services/otp-store.ts` (`issueOtp` sets it; the new `resendOtp`
  reads it before deciding to issue).
- **Lifecycle**: created on every `issueOtp` call (register, login bounce, manual
  resend); expires on its own TTL; never explicitly deleted.

### OTP challenge — `otp:verify:{email}` (Redis)

- **Represents**: the live 6-digit challenge for `email` (HMAC hash + attempt count).
- **Fields**: unchanged — `hash`, `attempts`; TTL `OTP_TTL_SEC` (300s).
- **Owned by**: `src/services/otp-store.ts`. `resendOtp`'s success path calls the
  existing `issueOtp`, which already replaces this key (`DEL` then `HSET`), so a
  successful resend invalidates the previously issued code — satisfying FR-007 with no
  new logic.

### Pending verification session — `pending_email` cookie

- **Represents**: which email address the verification screen (and now the resend
  action) applies to.
- **Fields**: unchanged — httpOnly cookie holding the normalised email, TTL
  `PENDING_EMAIL_TTL_SEC` (15 min).
- **Owned by**: `src/lib/constants/auth.ts` (name/TTL), set by `registerAction` and
  `loginAction` (`AUTH_022` branch), read by `VerifyOtpPage`, `verifyOtpAction`, and the
  new `resendOtpAction`.

## New in-memory shape (not persisted)

### `ResendOtpState` (`src/lib/constants/resend-otp-state.ts`)

Mirrors the existing `VerifyOtpState` pattern (a plain type outside the `'use server'`
module, since that module may only export async functions):

```text
ResendOtpState = {
  status: 'idle' | 'pending' | 'sent' | 'cooldown' | 'error'
  message?: string
}
initialResendOtpState: ResendOtpState = { status: 'idle' }
```

- `sent` — a new code was issued and emailed this call.
- `cooldown` — rejected because `otp:cooldown:{email}` was still set; `message` tells
  the user to wait.
- `error` — session expired (no/invalid `pending_email` cookie) or an unexpected
  failure; `message` matches the existing `SESSION_EXPIRED` copy from
  `verify-otp.ts` for the expired case, so the two OTP-flow error messages stay
  consistent.

No `pending`-vs-`sent` transition needs to survive a reload — like `VerifyOtpState`,
this is `useActionState` component state, not a cookie or a store.
