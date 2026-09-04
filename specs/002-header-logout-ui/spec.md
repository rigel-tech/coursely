# Feature Specification: Header Logout UI

**Feature Branch**: `feat/login-email` (no dedicated branch hook configured; work continues on the active branch)

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Header logout UI: khi proxy đã forward x-user-id (student đã đăng nhập), header ẩn LoginCta/RegisterCta và hiển thị nút \"Đăng xuất\" cho thiết bị hiện tại. Nút gọi server action logoutAction đã có sẵn (src/actions/auth/logout.ts) và điều hướng full-document tới redirectTo mà action trả về, giống cách LoginForm xử lý redirectTo. Không tự gọi redirect() trong action. Chỉ làm \"đăng xuất thiết bị này\"; không làm \"đăng xuất mọi thiết bị\" lần này. Server actions logoutAction/logoutAllAction đã hoàn thành và có test ở spec 001-access-refresh-sessions — feature này chỉ là lớp UI còn thiếu."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A signed-in visitor signs out from the header (Priority: P1)

A visitor who has signed in on this device sees, in the site header, a way to end
their session. When they choose it, their session on this device is ended and they
land on the public home page as an anonymous visitor. The header then offers sign-in
and registration again.

**Why this priority**: Without this, a signed-in visitor has no way to sign out of the
public site — the sign-out capability exists in the system but is unreachable. This is
the whole feature.

**Independent Test**: Sign in on a device, load any public page, confirm the header
shows a sign-out control (and no longer shows sign-in / register). Activate it. Confirm
the visitor is returned to the home page, the session is no longer active (a protected
page is not reachable and a browser refresh keeps them anonymous), and the header again
shows sign-in / register.

**Acceptance Scenarios**:

1. **Given** a visitor with an active session on this device, **When** any public page
   renders, **Then** the header shows a "Đăng xuất" control and does not show the
   "Đăng nhập" or "Đăng ký" controls.
2. **Given** that visitor, **When** they activate "Đăng xuất", **Then** their session on
   this device is ended and the browser navigates to the public home page.
3. **Given** the visitor has just signed out, **When** the home page loads, **Then** the
   header shows "Đăng nhập" and "Đăng ký" and no "Đăng xuất" control.
4. **Given** a visitor with no active session, **When** any public page renders, **Then**
   the header shows "Đăng nhập" and "Đăng ký" and no "Đăng xuất" control.
5. **Given** the visitor was on a protected page when they signed out, **When** sign-out
   completes, **Then** they are taken to the public home page (not returned to the
   protected page).

---

### Edge Cases

- **Sign-out while already signed out** (session expired in another tab): activating the
  control still clears local session cookies and returns the visitor to the home page —
  it never errors or hangs.
- **Double activation**: activating the control twice in quick succession does not
  produce two navigations or a visible error; the control is unavailable while a
  sign-out is in progress.
- **Admin session in the same browser**: an admin signed into the admin area is
  unaffected — the public header's sign-out control acts only on the public-site
  session, and the admin area's own session is left intact.
- **Sign-out request fails server-side** (backend unavailable): the visitor is not left
  looking signed in on a page they can no longer use; the local session cookies are
  cleared and they are returned to the home page. (The existing sign-out action already
  clears cookies before returning.)
- **JavaScript disabled**: acceptable degradation for this release — the control may not
  function without client scripting, consistent with the existing sign-in form.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The public site header MUST show a sign-out control ("Đăng xuất") when the
  current request carries an authenticated public-site identity.
- **FR-002**: The public site header MUST hide the sign-in and registration controls
  whenever the sign-out control is shown, and vice versa — exactly one of the two states
  is visible at a time.
- **FR-003**: Activating the sign-out control MUST invoke the existing sign-out
  behaviour for the current device (end this device's session, clear its session
  cookies, record the sign-out event) — this feature adds no new server behaviour.
- **FR-004**: After the sign-out behaviour completes, the browser MUST perform a
  full-document navigation to the location the sign-out action reports (the public home
  page), so the destination re-reads session state from scratch.
- **FR-005**: The feature MUST NOT introduce a redirect inside the server action; the
  client owns the navigation (consistent with the existing sign-in flow and the
  repo invariant on auth server actions).
- **FR-006**: While a sign-out is in progress, the control MUST be non-interactive so it
  cannot be triggered twice.
- **FR-007**: "Sign out from all devices" is explicitly OUT OF SCOPE for this feature —
  only the current device's session is ended.
- **FR-008**: The sign-out control MUST follow the public site's existing header styling
  and component conventions (same button system as the sign-in / register controls).

### Key Entities

Not applicable — no new data. The feature reads the already-forwarded request identity
and calls an existing action.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A signed-in visitor can sign out of the public site from the header in a
  single action, with no page hunting — the control is on every public page's header.
- **SC-002**: 100% of the time, after sign-out the visitor cannot reach a protected page
  and a browser refresh keeps them anonymous.
- **SC-003**: The header's two states are mutually exclusive in 100% of renders: a
  signed-in visitor never sees "Đăng nhập"/"Đăng ký", and an anonymous visitor never
  sees "Đăng xuất".
- **SC-004**: An admin working in the admin area in the same browser is never signed out
  of the admin area by using the public header's sign-out control.
- **SC-005**: No new environment variable, collection, or server action is introduced;
  the change is confined to the public header UI.

## Assumptions

- **Existing sign-out action is reused as-is.** `logoutAction` (this device) already
  exists, is tested, ends the session, clears cookies, writes the audit row, and returns
  the post-sign-out location. This feature only makes it reachable from the header.
- **Identity is already available to the header.** The route guard forwards the
  authenticated public-site identity on each request; the header can read it to decide
  which state to render. "Signed in" for this feature means that forwarded identity is
  present.
- **Home page is the post-sign-out destination.** The sign-out action reports the home
  page; this feature follows whatever it reports and does not choose its own target.
- **Client-side navigation mirrors the sign-in form.** The existing sign-in form performs
  a full-document navigation to the action's reported location; sign-out uses the same
  approach for the same reason (the destination must re-read session state, and the
  admin area is a separate route tree).
- **No visitor identity is displayed.** The header shows a plain sign-out control, not
  the visitor's name or email; showing identity is a separate, later concern.
- **Registration control parity.** The header currently always shows both "Đăng nhập"
  and "Đăng ký"; both are hidden together when signed in, per the user's description.
- **Admin header is untouched.** The Payload admin UI has its own sign-out; this feature
  is the public site header only.
