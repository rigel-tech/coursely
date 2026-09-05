# Implementation Plan: Login OTP Resend

**Branch**: `004-login-otp-resend` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-login-otp-resend/spec.md`

## Summary

Two call sites currently reach the "unverified account" state without ever sending a
usable code: the login bounce (`authenticateUser` → `AUTH_022`) and the verification
screen's "Gửi lại mã" button (dead — not wired to any action). Both need to issue a
fresh OTP and email it, gated by the same 60-second `otp:cooldown:{email}` key already
used by `issueOtp`. The approach: add one cooldown-respecting entry point to
`otp-store.ts`, call it from `authenticateUser`'s `AUTH_022` branch (fire-and-forget,
mirroring `registerStudent`), and add a small `resendOtpAction` server action wired to
the existing button, with a `useActionState` pair to surface sent/cooldown/error/expired
states.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router, Node (Payload CMS 3 runtime)

**Primary Dependencies**: Payload CMS 3 (`payload.sendEmail`), `ioredis` (OTP cooldown
state), React 19 (`useActionState` for the two client forms)

**Storage**: Redis only — reuses the existing `otp:cooldown:{email}` / `otp:verify:{email}`
keys in `src/services/otp-store.ts`; no schema or new key namespace

**Testing**: Vitest — `tests/unit` (pure logic, no infra) and `tests/int` (needs
Postgres + Redis, per `CLAUDE.md`)

**Target Platform**: Web (Next.js Server Actions, Vercel/Node server)

**Project Type**: Single Next.js web app (no separate frontend/backend split)

**Performance Goals**: N/A — low-frequency auth flow, no throughput target

**Constraints**: Must not send a verification email more than once per 60s per address,
across the login path and the manual resend path combined (FR-002); must not alter the
existing registration cooldown behavior (out of scope, see Assumptions in spec.md)

**Scale/Scope**: 1 new exported function (`otp-store.ts`), 1 edited function
(`authenticateUser`), 1 new server action, 1 edited component (`OtpForm.tsx`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **II. Simple first** — reuses `issueOtp`/`sendVerifyOtpEmail` exactly as
  `registerStudent` already does; the only new logic is a cooldown peek before issuing.
  No new abstraction layer, no config surface. **Pass.**
- **III. Change only what was asked** — touches `otp-store.ts`, `login.ts`, one new
  action file, and `OtpForm.tsx`. Does not touch the registration path (which has its
  own, intentionally different, always-issue behavior) or the verify action.
  **Pass.**
- **IV. Drive to verifiable goals** — every FR in spec.md maps to an acceptance
  scenario; tests are drafted before code per the Settled Decisions test-list gate.
  **Pass.**
- No UI colour, Payload collection/field, or invariant-file changes anticipated — the
  signposted gates in `CLAUDE.md` (theme tokens, Payload skill, INVARIANTS.md) do not
  apply to this feature's file set. **N/A.**

No violations. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-login-otp-resend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── services/
│   ├── otp-store.ts         # EDIT — add resendOtp(email): cooldown-gated issue
│   └── login.ts              # EDIT — authenticateUser's AUTH_022 branch fires resendOtp
├── actions/auth/
│   ├── login.ts               # unchanged
│   └── resend-otp.ts          # NEW — server action reading pending_email cookie
├── lib/constants/
│   └── resend-otp-state.ts    # NEW — ResendOtpState type + initial state
└── app/(frontend)/user/verify-otp/
    └── OtpForm.tsx             # EDIT — wire "Gửi lại mã" to resendOtpAction

tests/
├── unit/
│   └── components/otp-form.spec.ts   # EDIT — resend button coverage
└── int/
    ├── login-action.spec.ts          # EDIT — AUTH_022 triggers a send (mocked)
    ├── otp-store.spec.ts             # EDIT — resendOtp cooldown behavior
    └── resend-otp-action.spec.ts     # NEW — action-level coverage
```

**Structure Decision**: Single Next.js app (no frontend/backend split exists in this
repo). All changes land inside the existing `src/services`, `src/actions/auth`,
`src/lib/constants`, and the one frontend route folder that already hosts the OTP
screen — no new top-level directories.

## Complexity Tracking

_No Constitution Check violations — table not applicable._
