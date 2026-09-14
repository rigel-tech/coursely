# Feature Specification: Enrollment Profile Completeness

**Feature Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature)

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "Yêu cầu hồ sơ đầy đủ trước khi đăng ký khóa học. Bên dưới thông tin đăng ký khóa học, hệ thống phải hiển thị thông tin cá nhân của học viên (họ tên, số điện thoại, email). Ba trường này là bắt buộc phải đầy đủ trước khi đăng ký được. Nếu thiếu, học viên phải sửa được ngay tại chỗ (không rời trang) rồi mới bấm đăng ký."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Registering with an incomplete profile (Priority: P1)

A signed-in student opens a course page to register. Their account is missing a full name
and/or a phone number — left blank at sign-up, or never filled in. Below the course
registration control, the student sees their profile information and can fill in what is
missing right there, without leaving the course page. Once complete, they submit the
registration and it succeeds.

**Why this priority**: This is the entire ask. A course the centre runs needs to be able to
reach the people who registered — a name and phone number are not optional for that to
work, and asking for them after the fact means someone has already registered without a
way to contact them.

**Independent Test**: Sign in as a student with a blank full name and phone number, open a
course page, confirm the profile fields appear below the registration control editable
in place, fill them in, submit, and confirm the enrollment is created.

**Acceptance Scenarios**:

1. **Given** a signed-in student with a blank full name, **When** they open a course page,
   **Then** their profile information is shown below the registration control, with the
   full name field editable and empty.
2. **Given** that student, **When** they submit the registration without filling in the
   missing full name, **Then** no enrollment is created and they are told what is missing.
3. **Given** that student, **When** they fill in the full name and submit, **Then** the
   enrollment is created and the change to their profile is saved.
4. **Given** a signed-in student whose full name and phone number are already on file,
   **When** they open a course page, **Then** all three fields (full name, phone, email)
   display as plain text, none of them an editable input, and nothing blocks their
   registration.
5. **Given** a visitor who submits a registration directly (bypassing the page), **When**
   their profile is missing a required field, **Then** the system refuses it the same way
   as scenario 2 — this is not a screen the visitor can be trusted to have gone through.

---

### Edge Cases

- **The student edits their profile here, then registration still fails for an unrelated
  reason** (duplicate enrollment, registration window closed). The profile edit already
  made must not be lost — it is a separate action from registering, not bundled into one
  all-or-nothing step — see FR-005.
- **A phone number already on file is invalid** (fails the format check used elsewhere in
  this app). Treated the same as blank — invalid is not complete.
- **The student has no enrollment yet vs. already has one for this course.** Unaffected —
  the course page already shows a status badge instead of the registration control once
  an enrollment exists (specs/007-enrollment-login-gate); this feature only concerns the
  case where the registration control is showing.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The course page MUST show the signed-in student's own profile information
  (full name, phone number, email) below the course registration control, whenever that
  control is showing.
- **FR-002**: A student MUST be able to add or correct their full name and phone number in
  that same location, without navigating away from the course page.
- **FR-003**: The system MUST NOT create an enrollment for a student whose full name or
  phone number is missing or invalid, regardless of what the page displayed or what the
  visitor's browser sent — the check is made by the party that creates the enrollment, not
  assumed from an earlier screen (matching specs/007-enrollment-login-gate's and
  specs/008-enrollment-duplicate-guard's own server-side gate).
- **FR-004**: When registration is refused for an incomplete profile, the student MUST be
  told specifically that their profile is incomplete, distinct from every other refusal
  this flow already has a message for.
- **FR-005**: A profile correction made in this location MUST be saved even if the
  registration attempt that follows it does not succeed for some other reason.

### Key Entities

- **Student profile**: the existing full name, phone number, and email already on the
  `Student` record. This feature adds no new field — it adds a completeness rule
  (non-blank, valid format) evaluated at the moment of registering, and a place on the
  course page to see and fix it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of courses registered for through this flow have a non-blank, validly
  formatted full name and phone number on the registering student's account afterward.
- **SC-002**: A student with an incomplete profile can go from opening the course page to
  a submitted, successful registration without navigating to any other page.
- **SC-003**: A registration attempt bypassing the course page entirely (profile
  incomplete) is refused 100% of the time.

## Assumptions

- Email is always present for an existing account (Payload's own auth mechanism requires
  it at sign-up) — "email is required" is therefore already true today for every student
  who can reach this screen at all; whether it is shown as editable here or read-only is
  Clarifications Q1, not a completeness question.
- The phone number format is the one this app already validates elsewhere
  (`VIETNAM_PHONE_REGEX`, `src/lib/validation/profile-schema.ts`) — this feature does not
  introduce a second standard.
- User-facing copy is Vietnamese, matching every string already on these screens.
- Full name and phone are shown per field, automatically, with no click needed to enter
  edit mode: a field that is already complete (non-blank, and for phone, validly
  formatted) displays as plain text, exactly like email; a field that is missing or
  invalid displays as an editable input in its place, immediately. There is no separate
  "Chỉnh sửa" step (unlike `/tai-khoan`'s `ProfileForm`, which edits the whole form at
  once only after that button is pressed) — confirmed with the user 2026-09-14.
- A consequence of the rule above: a field that already holds a validly-formatted but
  factually wrong value (a phone number that is someone else's, say) is not editable from
  this screen — only blank or invalidly-formatted values are. Correcting a valid-looking
  but wrong value stays `/tai-khoan`'s job, consistent with this feature not being a second
  profile-edit screen.

## Out of Scope

- Editing the profile avatar or password from this location.
- Any change to how or whether email can be edited, beyond what Q1 settles for this one
  screen — a broader "email is now editable" change, and the re-verification it would
  need, is a separate feature if ever taken up.
- The existing `/tai-khoan` account page and its own edit flow — unchanged (Q3).

## Clarifications

### Q1 — Does email become editable here, or stay read-only? (resolved 2026-09-14)

**Answer**: Read-only, same as the account page. "Required" is satisfied trivially — every
account that can reach this screen already has one.

**Why**: consistent with the one existing rule this app has about email
(`ProfileForm.tsx`, "Không thể thay đổi"); making it editable here would open a second,
contradicting path with no re-verification story, for a field that never actually blocks
registration anyway.

### Q2 — Does profile completeness block the registration server-side, or only guide the UI? (resolved 2026-09-14)

**Answer**: A real server-side gate in `createEnrollmentAction` (FR-003 as written, not
softened).

**Why**: matches the precedent both `specs/007-enrollment-login-gate` and
`specs/008-enrollment-duplicate-guard` already set for their own conditions. A client-only
check would leave open exactly the gap this feature exists to close: a request that skips
the course page could otherwise still create an enrollment with no way to reach the
student.

### Q3 — Reuse the existing profile-edit action, or build one scoped to this screen? (resolved 2026-09-14)

**Answer**: A new action/schema scoped to this registration context. `updateProfileAction`
and `profileSchema` (`/tai-khoan`) are left exactly as they are today.

**Why**: tightening the shared `profileSchema` to require non-blank values would change
`/tai-khoan`'s own accepted input as a side effect — a screen this feature was not asked to
touch (Principle III). Some validation logic is duplicated rather than shared as a result.
