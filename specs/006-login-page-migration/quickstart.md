# Quickstart: Validating the Login Page Migration

Prerequisites: `pnpm dev` running.

## Scenario 1 — sign in from the dedicated page

1. From any page, click "Đăng nhập" in the header. **Expect**: navigates to
   `/dang-nhap` — a full page, not a popover.
2. Submit correct credentials. **Expect**: signed in, redirected exactly as before
   (home, or `/admin` for an admin account).
3. Submit wrong credentials / a rate-limited / locked / disabled account. **Expect**:
   the same message as the old popover showed, still on `/dang-nhap`.
4. Submit credentials for an unverified account. **Expect**: bounced to
   `/xac-thuc-otp`, unchanged.
5. Click "Quên mật khẩu?" on the sign-in page. **Expect**: reaches the forgot-password
   page, unchanged.

## Scenario 2 — blocked from a protected page, signed out

1. While signed out, request a protected page directly (e.g. `/tai-khoan`).
   **Expect**: lands on `/dang-nhap?callbackUrl=%2Ftai-khoan`, not the homepage.
2. Sign in with correct credentials. **Expect**: redirected to `/tai-khoan` — the
   originally requested page — in this one attempt.

## Scenario 3 — no leftover popover

1. Confirm no page shows a login popover/floating card anywhere (only "Đăng ký"
   remains a popover, per spec.md's explicit exclusion).
2. Confirm `src/components/public/LoginCta/` no longer exists in the repo.

## Automated coverage

`pnpm test:unit` — `login-form.spec.ts` (moved import path, same assertions),
`header-auth-controls.spec.ts` (Link instead of button), `route-guard.spec.ts`
(callbackUrl destination now `/dang-nhap`).
