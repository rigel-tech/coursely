# Quickstart: Validating Login OTP Resend

Prerequisites: `docker compose up -d` (Postgres + Redis), `pnpm dev` running, a mail
sink the dev config points at (or read `payload.sendEmail` logs / the console
transport, whichever this project's `.env` configures).

## Scenario 1 — login bounce sends a fresh code (User Story 1)

1. Register a new account at `/register` but do not enter the OTP — leave it
   `PENDING_VERIFICATION`. Note the address.
2. Wait 61+ seconds (past the resend cooldown from the registration send).
3. Go to the login form and submit that email + the password you registered with.
4. **Expect**: redirected to `/user/verify-otp`; a new email arrives with a 6-digit
   code; that code succeeds against the verification form.
5. Repeat steps 3–4 immediately (within 60s of the last send) with a second login
   attempt. **Expect**: still bounced to `/user/verify-otp`, but no second email is
   sent (check the mail sink count).

## Scenario 2 — manual resend (User Story 2)

1. From the verification screen (arrived via either registration or Scenario 1),
   click "Gửi lại mã".
2. **Expect**: a new email arrives; the button reflects a sent/cooldown state and is
   not immediately clickable again.
3. Click "Gửi lại mã" again right away. **Expect**: no new email; a message telling
   you to wait.
4. Clear the `pending_email` cookie (or wait out its 15-minute TTL) and click
   "Gửi lại mã" again. **Expect**: the same session-expired message used elsewhere in
   this flow; no email sent.

## Automated coverage

Run `pnpm test:unit` for the pure/component-level assertions and
`pnpm test:int` (needs the Postgres + Redis containers above) for the Redis-backed
cooldown and full-flow assertions — see `tasks.md` for the exact spec files touched.
