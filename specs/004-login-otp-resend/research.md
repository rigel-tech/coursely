# Phase 0 Research: Login OTP Resend

No `[NEEDS CLARIFICATION]` markers remain in `spec.md`, and the feature deliberately
reuses infrastructure that already exists in this codebase, so this phase is a short
confirmation of the reuse points rather than open research.

## Decision: cooldown check lives in `otp-store.ts`, not the caller

**Decision**: Add one function, `resendOtp(email)`, to `src/services/otp-store.ts` that
peeks `otp:cooldown:{email}` before calling the existing `issueOtp`, returning
`{ ok: false, reason: 'cooldown' }` instead of issuing when the key is still set.

**Rationale**: `otp:cooldown:{email}` is already the single source of truth for "was a
code sent recently" (per `issueOtp`'s own doc comment). Two call sites (login bounce,
manual resend) need the identical check; putting it in the store next to `issueOtp`
means neither caller can drift from the other or from the key's TTL semantics.

**Alternatives considered**:

- _Duplicate the cooldown peek in each caller_ — rejected: two copies of "read
  `otp:cooldown:{email}` and branch" is exactly the kind of drift the store module
  exists to prevent.
- _Add a generic `peekRate`-style helper in `src/lib/rate-limit.ts`_ — rejected:
  that module models counters with a limit (`INCR` + threshold); the cooldown key is a
  plain presence flag (`SET ... EX`), a different shape, and `otp-store.ts` already owns
  all three OTP-related Redis keys.

## Decision: login's send is fire-and-forget, matching `registerStudent`

**Decision**: `authenticateUser`'s `AUTH_022` branch calls `resendOtp` then
`void sendVerifyOtpEmail(...).catch(...)` — same shape as
`src/services/register.ts:88-92` — rather than awaiting delivery or surfacing SMTP
failure to the login response.

**Rationale**: `LoginServiceResult`'s `AUTH_022` variant is a fixed shape
(`{ ok: false; code: 'AUTH_022'; message; email; redirectTo }`) consumed by
`loginAction` and already covered by existing tests; changing it to carry a send-outcome
field would ripple into `login-state.ts`, `LoginForm.tsx`, and every existing assertion
on that variant for no requirement in spec.md (which explicitly leaves delivery-failure
surfacing out of scope).

**Alternatives considered**:

- _Await the email send and fail login on SMTP error_ — rejected: a transient mail
  outage would then block a correct login entirely, worse than today's behavior, and
  contradicts the fire-and-forget precedent already established by registration.

## Decision: resend button gets its own `useActionState`, not a shared one

**Decision**: `OtpForm.tsx` keeps its existing `useActionState(verifyOtpAction, ...)`
for the code field, and adds a second, independent `useActionState(resendOtpAction, ...)`
for the resend button, rendered as a sibling `<form>` (a nested `<form>` inside the
verify form is invalid HTML).

**Rationale**: The two actions have unrelated pending/result states — submitting a code
and requesting a new one are different user intents that can legitimately be pending at
different times (e.g. resend cooldown after a code has already failed once). One shared
state would force one of the two flows to fabricate members it doesn't need
(`redirectTo` on resend, `cooldownSeconds` on verify).

**Alternatives considered**:

- _Single form, `formAction` prop per submit button (React 19 feature)_ — considered
  viable, but two buttons sharing one `useActionState` still collapse both outcomes into
  one `state.status`, which cannot distinguish "code was wrong" from "resend is on
  cooldown" without a discriminant field neither variant otherwise needs. Rejected for
  the same reason as the shared-state option above.
