# Feature Specification: Login Page Migration

**Feature Branch**: `006-login-page-migration`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Chuyển đăng nhập (login) từ một popover trong header (LoginCta mở Card chứa LoginForm, tại src/components/public/LoginCta/) thành một trang thật dưới src/app/(frontend)/user/login/ (theo đúng pattern các trang auth khác đã có: forgot-password, reset-password, verify-otp, account). Yêu cầu cụ thể: (1) Tạo trang /user/login với LoginForm hiện tại, bỏ phần chrome của popover. (2) HeaderAuthControls đổi nút 'Đăng nhập' thành Link sang '/dang-nhap', và route-guard phải redirect thẳng tới '/dang-nhap?callbackUrl=<path>' thay vì '/?callbackUrl=<path>'. (3) Xoá thư mục src/components/public/LoginCta/ sau khi form đã chuyển hẳn sang trang mới. (4) Không đụng vào RegisterCta."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Signing in from a dedicated page (Priority: P1)

A visitor clicks "Đăng nhập" in the site header. Instead of a small form popping up
beneath the button, they land on a full sign-in page with the same email/password
form, "remember me" option, and "forgot password?" link they had before — just given
its own page and its own address, matching how every other account-related flow
(register, forgot password, reset password, OTP verification, account settings)
already gets its own page in this app.

**Why this priority**: This is the entire ask — the visible behavior change from
popover to page. Every other requirement in this feature exists only to make this
work without regressing what already works today.

**Independent Test**: Click "Đăng nhập" from any page, confirm the browser navigates
to the sign-in page (not a popover), submit valid credentials, and confirm sign-in
succeeds exactly as it does today (session cookies set, redirected onward).

**Acceptance Scenarios**:

1. **Given** a signed-out visitor on any page, **When** they click "Đăng nhập" in the
   header, **Then** they navigate to the sign-in page.
2. **Given** a visitor on the sign-in page, **When** they submit correct credentials,
   **Then** they are signed in and redirected exactly as the popover form does today
   (home, an admin destination, or a prior destination — see User Story 2).
3. **Given** a visitor on the sign-in page, **When** they submit credentials for an
   account that is rate-limited, has the wrong password, is locked, is disabled, or is
   still unverified, **Then** they see the same corresponding message the popover form
   shows today, without leaving the sign-in page (except the unverified case, which
   still bounces to the OTP screen exactly as today).
4. **Given** a visitor on the sign-in page, **When** they click "Quên mật khẩu?", **Then**
   they reach the forgot-password page, unchanged.

**Independent Test extras**: also confirm the sign-in page has no leftover popover
chrome (no toggle button behavior, no click-outside-to-close, no floating card) — it
is a normal page.

---

### User Story 2 - Reaching sign-in directly when a protected page requires it (Priority: P1)

A visitor tries to open a page that requires being signed in. Today they get bounced
to the homepage carrying their intended destination, where they must notice and click
the header's login button themselves before they can even see a form. With sign-in
now a dedicated page, this bounce must land the visitor directly on the sign-in page —
with their intended destination preserved — so signing in still returns them to where
they were headed, without adding an extra click that didn't exist before.

**Why this priority**: Without this, moving login off the homepage strands anyone who
gets bounced there today: the popover they used to land next to is gone, and nothing
replaces its role as an immediately-visible form.

**Independent Test**: While signed out, request a protected page directly, confirm the
resulting page is the sign-in page (not the homepage), sign in, and confirm you land
back on the page you originally requested.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor requesting a protected page, **When** the request is
   blocked, **Then** they land on the sign-in page, not the homepage.
2. **Given** that redirected visitor, **When** they sign in successfully, **Then** they
   are returned to the protected page they originally requested — identical to today's
   outcome once the popover form on the homepage was used.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The site MUST provide a dedicated, directly navigable sign-in page
  containing the same sign-in form fields, validation, "remember me" option, and
  "forgot password?" link that exist today.
- **FR-002**: The sign-in page MUST report every outcome the current form reports
  (invalid input, rate-limited, wrong credentials, account locked, account disabled,
  account unverified) using the same messages/behavior as today, without requiring any
  page other than itself and the pre-existing unverified-account bounce.
- **FR-003**: The header's sign-in control MUST navigate to the sign-in page instead of
  opening an in-place form.
- **FR-004**: A signed-out visitor blocked from a protected destination MUST be routed
  directly to the sign-in page (not the homepage), with their originally requested
  destination preserved through to a successful sign-in.
- **FR-005**: Successful sign-in from the new page MUST redirect the same way it does
  today (home, an admin destination, or the preserved originally-requested destination).
- **FR-006**: The popover sign-in entry point being replaced MUST be removed once the
  page-based sign-in is in place — no dead, unreachable popover code left behind.
- **FR-007**: The header's separate "Đăng ký" (register) entry point and its own
  popover behavior MUST NOT be changed by this feature.

### Key Entities

- **Sign-in destination**: The intended page a visitor was trying to reach before
  being asked to sign in; carried from the point of being blocked through to a
  successful sign-in, same concept as today, just now anchored to the new sign-in
  page's own address instead of the homepage's.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every path that used to open the login popover (the header button, and
  being blocked from a protected page) now lands on the dedicated sign-in page instead.
- **SC-002**: A visitor blocked from a protected page and then signing in successfully
  reaches that original page in the same single sign-in attempt as before — no added
  step.
- **SC-003**: No popover sign-in UI remains reachable anywhere in the site after this
  change ships.

## Assumptions

- "Register" (`RegisterCta`) stays exactly as it is — a popover — per the request's
  own scope boundary; nothing about its behavior, appearance, or code changes.
- The sign-in page's public address follows this app's existing convention for these
  flows: a Vietnamese-language path rewritten onto the English-named folder housing
  the page (the same mechanism already used for forgot-password, reset-password, OTP
  verification, and the account page).
- The account-unverified bounce (to the OTP-verification screen) is unaffected — it
  already redirects independently of where the sign-in attempt was submitted from.
