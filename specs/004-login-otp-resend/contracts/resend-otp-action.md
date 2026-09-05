# Contract: `resendOtpAction` (Server Action)

Location: `src/actions/auth/resend-otp.ts` (new). Same shape as the existing
`verifyOtpAction` — a `'use server'` function bound to `useActionState`, so its
signature is `(prevState: ResendOtpState, formData: FormData) => Promise<ResendOtpState>`.
`formData` carries no fields — the target address comes from the `pending_email`
cookie, identical to `verifyOtpAction`.

## Preconditions

- Caller has a `pending_email` cookie (httpOnly, set by `registerAction` or
  `loginAction`'s `AUTH_022` branch).

## Outcomes

| Condition                  | `status`   | `message`                                                                                   | Side effect                                                                                                           |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| No `pending_email` cookie  | `error`    | `SESSION_EXPIRED` copy (same string as `verify-otp.ts`)                                     | none                                                                                                                  |
| `otp:cooldown:{email}` set | `cooldown` | "Vui lòng đợi trước khi gửi lại." (or equivalent — wait-and-retry copy)                     | none                                                                                                                  |
| Cooldown clear             | `sent`     | none required                                                                               | `resendOtp(email)` issues a new code; `sendVerifyOtpEmail` fires (fire-and-forget, same pattern as `registerStudent`) |
| Unexpected exception       | `error`    | generic "Có lỗi hệ thống. Vui lòng thử lại sau." (matches `verifyOtpAction`'s catch branch) | none (logged)                                                                                                         |

## Non-goals

- Does not touch account status, session cookies, or `redirectTo` — the user stays on
  the verification screen regardless of outcome.
- Does not rate-limit by IP — the existing `OTP_MAX_SENDS_PER_WINDOW` (5/hour) quota in
  `otp-store.ts`'s `issueOtp` already bounds abuse per email; no new limiter is
  introduced (see spec.md Assumptions).

## Consumer contract (`OtpForm.tsx`)

- Bound via its own `useActionState(resendOtpAction, initialResendOtpState)`, independent
  from the verify-code `useActionState` (see research.md).
- Renders as a sibling `<form>` (a `<button>` cannot itself be a `useActionState` form
  root, and a `<form>` cannot nest inside the existing verify `<form>`).
- Button is disabled while `pending` (from `useFormStatus` in that sibling form) and
  shows `state.message` for `cooldown` / `error`; on `sent` shows a brief confirmation.
