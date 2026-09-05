# Feature Specification: Login OTP Resend

**Feature Branch**: `004-login-otp-resend`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Khi đăng nhập, nếu tài khoản đang ở trạng thái PENDING_VERIFICATION (chưa xác thực email), hệ thống chuyển hướng người dùng sang trang /user/verify-otp nhưng KHÔNG gửi lại mã OTP mới qua email — hiện chỉ trang /register mới issue+gửi OTP. Cần: (1) authenticateUser (src/services/login.ts) hoặc loginAction, khi trả AUTH_022 (tài khoản chưa xác thực), phải issue một OTP mới và gửi email xác thực, tương tự luồng registerStudent trong src/services/register.ts (issueOtp + sendVerifyOtpEmail), đồng thời tôn trọng cooldown resend hiện có (60s, otp:cooldown:{email} trong src/services/otp-store.ts) để tránh spam email nếu người dùng bấm đăng nhập nhiều lần liên tiếp. (2) Nút 'Gửi lại mã' trên trang OTP (src/app/(frontend)/user/verify-otp/OtpForm.tsx) hiện là <button type='button'> không có onClick, chưa nối với action nào — cần một server action resend OTP (đọc cookie pending_email, tôn trọng cooldown, issue+gửi OTP mới) và nối nút này vào action đó, hiển thị trạng thái loading/lỗi/cooldown phù hợp."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - OTP arrives after being bounced back from login (Priority: P1)

A user registered but never verified their email, closed the tab, and later comes
back and tries to log in with their email and password. Their credentials are
correct, but the account is still unverified, so they land on the verification
screen. They need a fresh, working code waiting in their inbox — not the stale
one from registration (which may already be expired or never received).

**Why this priority**: This is the exact failure reported — without it, a
returning unverified user has no way to ever get past the verification screen
if their original code lapsed, effectively locking them out of an account they
rightfully own.

**Independent Test**: Register an account without verifying it, wait past the
account's own send, then submit correct credentials on the login form. Verify a
new email arrives and the code in it succeeds against the verification screen.

**Acceptance Scenarios**:

1. **Given** an account in PENDING_VERIFICATION status and no OTP send in the
   last 60 seconds for that email, **When** the user submits correct
   credentials on the login form, **Then** the system sends a new verification
   email and the user is routed to the verification screen.
2. **Given** an account in PENDING_VERIFICATION status where a verification
   email was already sent within the last 60 seconds (e.g. the user just came
   from registration, or double-submitted login), **When** the user submits
   correct credentials on the login form, **Then** the system routes the user
   to the verification screen without sending a duplicate email.
3. **Given** an account in PENDING_VERIFICATION status, **When** the user
   submits incorrect credentials, **Then** no verification email is sent (login
   failure is reported the same as for any other wrong password).

---

### User Story 2 - Manually requesting a new code on the verification screen (Priority: P2)

A user is sitting on the verification screen — whether they arrived via
registration or via the login bounce — and their code has expired, was lost, or
never arrived. They click "Gửi lại mã" (Resend code) and expect a new code to
be sent, with clear feedback if they click it too soon or if something goes
wrong.

**Why this priority**: This is the other half of getting an unverified user
unstuck; without it, a user whose code lapses only gets one more chance (a
fresh login attempt) instead of a direct, purpose-built way to request a new
code.

**Independent Test**: From the verification screen, click "Gửi lại mã" and
confirm a new email is sent and the button reflects a cooldown afterward;
click it again immediately and confirm it is rejected with a clear message
instead of sending a second email.

**Acceptance Scenarios**:

1. **Given** the user is on the verification screen with a valid pending
   session (pending-email cookie present) and no send in the last 60 seconds,
   **When** they click "Gửi lại mã", **Then** a new verification email is sent
   and the button shows a pending/cooldown state.
2. **Given** the user clicks "Gửi lại mã" again before the 60-second cooldown
   elapses, **When** the click is submitted, **Then** no new email is sent and
   the user sees a message telling them to wait.
3. **Given** the pending-email session has expired or is missing (e.g. cookie
   gone), **When** the user clicks "Gửi lại mã", **Then** they see the same
   "session expired, please register again" message used elsewhere in this
   flow, and no email is sent.

---

### Edge Cases

- What happens when the login bounce (User Story 1) and a manual resend
  (User Story 2) race within the same 60-second window? The second of the two
  must be treated as a cooldown hit, not a duplicate send.
- What happens when the account is PENDING_VERIFICATION but the mail provider
  fails to deliver? The user is still routed to the verification screen
  (matching current registration behavior, where email send is
  fire-and-forget); this spec does not add new delivery-failure surfacing.
- What happens if the user is DISABLED or already ACTIVE and somehow reaches
  the resend action (e.g. stale tab)? No email is sent; the existing
  session-expired / disabled messaging is shown, consistent with the OTP
  verification action's own handling of those states.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: When login credentials are valid but the account status is
  PENDING_VERIFICATION, the system MUST issue a new OTP and send a
  verification email to that address, unless a send for that address happened
  within the last 60 seconds.
- **FR-002**: The system MUST NOT send a verification email when login
  credentials are invalid, regardless of account status.
- **FR-003**: The verification screen MUST offer a control the user can
  activate to request a new OTP be sent to their pending email address.
- **FR-004**: Requesting a new OTP from the verification screen MUST be
  subject to the same 60-second resend cooldown used elsewhere in the OTP
  flow, and MUST tell the user to wait when the cooldown is still active
  rather than silently doing nothing.
- **FR-005**: Requesting a new OTP from the verification screen MUST only
  succeed while the user has a valid pending-verification session; otherwise
  it MUST show the same "session expired" messaging already used for an
  expired/incorrect code on this screen.
- **FR-006**: While a resend request (from login or from the verification
  screen) is in flight or has just completed, the user MUST see a state
  distinguishing "sending" / "sent, wait before retrying" / "failed" so they
  are not left guessing whether to click again.
- **FR-007**: A successful OTP resend MUST invalidate the previously issued
  code for that address (only the newest code works), consistent with how
  issuing a code already behaves during registration.

### Key Entities

- **Pending verification session**: The signal (address + short-lived cookie)
  that identifies which email address a resend or verify attempt applies to.
- **OTP send cooldown**: A per-email, time-boxed lock (60 seconds) shared by
  every path that can trigger a new code, preventing duplicate sends across
  registration, login, and manual resend.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user who registers without verifying, returns later, and logs
  in with correct credentials receives a working verification code by email
  every time their prior code has gone stale.
- **SC-002**: No user ever receives two verification emails for actions taken
  within the same 60-second window, across login attempts and manual resend
  clicks combined.
- **SC-003**: 100% of clicks on "Gửi lại mã" produce a visible outcome for the
  user (sent / please wait / session expired) — none are silently ignored.

## Assumptions

- The 60-second cooldown and its storage (`otp:cooldown:{email}`) already
  implemented in `src/services/otp-store.ts` is the single source of truth for
  "was a code sent recently" and is reused as-is, not redefined per call site.
- Email delivery stays fire-and-forget (as in the existing registration flow):
  the user is routed forward / shown a sent state without waiting on or
  surfacing SMTP-level failures.
- "Gửi lại mã" reuses the existing `pending_email` cookie already set by both
  the registration and login flows; it does not introduce a new identification
  mechanism.
- Rate limiting beyond the existing per-email send cooldown and the OTP
  service's own hourly quota (5 sends/hour) is out of scope for this feature.
