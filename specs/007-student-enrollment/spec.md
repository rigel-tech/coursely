# Feature Specification: Student Enrollment

**Feature Branch**: `feat/student-enrollment`

**Created**: 2026-09-14

**Merged**: 2026-09-15 — consolidates three specs written and shipped incrementally against
this same branch: `007-enrollment-login-gate`, `008-enrollment-duplicate-guard`,
`009-enrollment-profile-completeness`. They were three separate `/speckit-specify` passes
because they were specified and built in stages, but they are one feature — a student
registering for a course — and reading them as three documents obscured that (stale
cross-references, Out of Scope lines one spec had already made untrue). This file replaces
all three; git history holds the originals.

**Status**: Implemented — except Story 4's course-window messages (Acceptance Scenarios 1–2),
a known, pre-existing gap; see that story's note below.

**Input**: Three user descriptions, merged:

1. _(login gate)_ "Đăng ký khóa học yêu cầu đăng nhập — quyết định do backend làm chủ. Bối
   cảnh: trên trang chi tiết khóa học, học viên bấm 'Đăng ký khóa học'. Hiện tại phía client
   tự hỏi một endpoint trạng thái đăng nhập rồi tự quyết định điều hướng sang trang đăng
   nhập hay mở form. Việc này phải chuyển xuống backend. (1) Học viên phải đăng nhập trước
   khi đăng ký được khóa học. (2) Nếu chưa đăng nhập, hệ thống đưa họ sang màn hình đăng
   nhập; đăng nhập thành công thì quay lại đúng trang khóa học đó với form đăng ký sẵn sàng
   để gửi lại. (3) Quyết định 'đã đăng nhập hay chưa' và 'đi đâu tiếp' thuộc về phía máy chủ
   khi xử lý hành động đăng ký, không phải do form/giao diện tự đoán trước. Ngoài ra: mọi lỗi
   máy chủ khi đăng ký hiện đều hiển thị chung một câu 'Không thể đăng ký khóa học. Vui lòng
   thử lại.', mỗi tình huống cần thông báo đúng với nó."
2. _(duplicate guard)_ "Chặn học viên đăng ký trùng một khóa học. Hiện tại không có gì ngăn
   một học viên tạo nhiều bản ghi enrollment cho cùng một khóa học — không có ràng buộc
   unique ở tầng database, không có hook nào kiểm tra trước khi tạo, service không tra cứu
   enrollment đã tồn tại trước khi insert. [...] Yêu cầu: một học viên không được có nhiều
   hơn một enrollment đang hoạt động cho cùng một khóa học. [...] hệ thống phải từ chối với
   một thông báo riêng, không tạo enrollment thứ hai, không để lộ lỗi ràng buộc database thô."
3. _(profile completeness)_ "Yêu cầu hồ sơ đầy đủ trước khi đăng ký khóa học. Bên dưới thông
   tin đăng ký khóa học, hệ thống phải hiển thị thông tin cá nhân của học viên (họ tên, số
   điện thoại, email). Ba trường này là bắt buộc phải đầy đủ trước khi đăng ký được. Nếu
   thiếu, học viên phải sửa được ngay tại chỗ (không rời trang) rồi mới bấm đăng ký."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Registering without being signed in (Priority: P1)

A visitor reads a course page and presses the course's registration button. They are not
signed in. Instead of the page guessing that in advance, the request is sent, the system
answers that a signed-in account is required, and the visitor is taken to the sign-in
screen. After signing in successfully they land back on the same course page, with the
registration control ready for them to press again. Pressing it now creates the enrollment.

**Why this priority**: This is the security boundary the other three stories build on top
of. Whether a visitor may enrol is a decision made when the enrolment is attempted, by the
party that performs it — not predicted by the screen beforehand.

**Independent Test**: Sign out, open a course page, press the registration button, confirm
arrival at the sign-in screen, sign in, confirm arrival back on that same course page, press
the button again, confirm the enrollment is created.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor on a course page, **When** they submit the registration,
   **Then** no enrollment is created and they are taken to the sign-in screen.
2. **Given** that visitor on the sign-in screen, **When** they sign in successfully, **Then**
   they arrive back on the course page they started from, at that course page's public
   address, with the registration control available.
3. **Given** a signed-in student in good standing, with a complete profile, on a course page
   they hold no active enrollment in, **When** they submit the registration, **Then** the
   enrollment is created and they are told it succeeded, without any detour through the
   sign-in screen.
4. **Given** a visitor who tampers with the submitted request to name a different return
   destination, **When** the system answers, **Then** the return destination is the course
   page for the course actually being registered for, and nothing else.
5. **Given** a signed-in student whose session expires while the course page is open, **When**
   they submit the registration, **Then** they are taken to the sign-in screen and, after
   signing in, back to that course page.

---

### User Story 2 - Registering with an incomplete profile (Priority: P2)

A signed-in student opens a course page to register. Their account is missing a full name
and/or a phone number — left blank at sign-up, or never filled in. Below the course
registration control, the student sees their profile information and can fill in what is
missing right there, without leaving the course page. Once complete, they submit the
registration and it succeeds.

**Why this priority**: A course the centre runs needs to be able to reach the people who
registered — a name and phone number are not optional for that to work, and asking for them
after the fact means someone has already registered without a way to contact them. Runs
after Story 1's gate (there is no profile to check for a visitor who is not signed in yet)
and before Stories 3/4's course- and duplicate-specific checks.

**Independent Test**: Sign in as a student with a blank full name and phone number, open a
course page, confirm the profile fields appear below the registration control editable in
place, fill them in, submit, and confirm the enrollment is created.

**Acceptance Scenarios**:

1. **Given** a signed-in student with a blank full name, **When** they open a course page,
   **Then** their profile information is shown below the registration control, with the full
   name field editable and empty.
2. **Given** that student, **When** they submit the registration without filling in the
   missing full name, **Then** no enrollment is created and they are told what is missing.
3. **Given** that student, **When** they fill in the full name and submit, **Then** the
   enrollment is created and the change to their profile is saved.
4. **Given** a signed-in student whose full name and phone number are already on file,
   **When** they open a course page, **Then** all three fields (full name, phone, email)
   display as plain text, none of them an editable input, and nothing blocks their
   registration.
5. **Given** a visitor who submits a registration directly (bypassing the page), **When**
   their profile is missing a required field, **Then** the system refuses it the same way as
   scenario 2 — this is not a screen the visitor can be trusted to have gone through.

---

### User Story 3 - Stopped from enrolling twice (Priority: P3)

A student who is already enrolled in a course submits the registration for that same course
again — from a second browser tab, a stale page they never reloaded, or by any other route
that reaches the registration action. The system refuses, tells them plainly they are already
enrolled, and creates no second enrollment. Their existing enrollment is untouched.

**Why this priority**: Every other requirement in this story exists to make this refusal
reliable (not just usually true) and legible (not a raw database error). Runs after the
signed-in and profile gates — there is no duplicate to guard against until a candidate
enrollment has passed both.

**Independent Test**: Enrol a student in a course through the normal flow, then submit the
same registration again for the same student and course. Confirm the second attempt is
refused, confirm exactly one enrollment record exists for that student/course pair
afterward, and confirm the first enrollment's data is unchanged.

**Acceptance Scenarios**:

1. **Given** a student with an existing NEW, CONFIRMED, ATTENDED, or COMPLETED enrollment in
   a course, **When** they submit the registration for that course again, **Then** no
   enrollment is created and they are told they are already enrolled.
2. **Given** a student whose only enrollment in a course is CANCELLED, **When** they submit
   the registration for that course again, **Then** a fresh enrollment is created — this is
   not a duplicate.
3. **Given** two submissions for the same student and course arriving at effectively the same
   time (two tabs, a double click), **When** both reach the system, **Then** exactly one
   enrollment exists afterward — the second is refused, not silently dropped and not silently
   duplicated.
4. **Given** a student refused for already being enrolled, **When** the refusal is shown,
   **Then** it names the situation in plain language and does not show a raw database or
   constraint error.
5. **Given** a student enrolling in a course they have never registered for, **When** they
   submit, **Then** nothing about this story changes the outcome — the enrollment is created
   exactly as it is without it.

---

### User Story 4 - Being told what actually went wrong (Priority: P4)

A student presses the registration button and the attempt cannot go through — the
registration window has not opened yet, or it has already closed. Without this story, every
one of these comes back as "Không thể đăng ký khóa học. Vui lòng thử lại.", which tells the
student nothing and invites them to retry something that will never succeed. Each refusal
states its own reason, so the student can tell "come back later", "you have missed it", and
"try again" apart.

**Why this priority**: Independent of the other three and shippable on its own, but it is the
reason routing every decision through the server (Stories 1–3) is worth doing end to end: a
server-made decision only helps the student if its answer actually reaches them intact. Ranks
below the other three because it is refinement of messaging, not a new gate.

**Independent Test**: Submit a registration for a course whose registration window has not
opened, and one whose window has closed; confirm each shows its own message, distinct from
the other and from the generic retry message.

> **Known gap (2026-09-15)**: `validateCourseForEnrollment` (`student-enrollment.ts`) already
> throws these two messages as plain `Error`s, but `createEnrollmentAction` only converts
> `EnrollmentAlreadyExists` to a returned message — anything else it re-throws, and
> `CourseRegistrationForm`'s client-side `.catch()` replaces **any** thrown error with the
> generic fallback regardless of its message. So Acceptance Scenarios 1–2 below are not
> actually satisfied end-to-end today: both course-window refusals currently show the
> generic retry text, not their own copy. This was called out as an accepted, unfinished gap
> when Story 3 shipped its own narrower `try/catch` (`research.md` Decision 3's note) and was
> never closed afterward. Scenarios 3–6 (the account-standing and generic-fallback cases) are
> unaffected and do work as specified, since those paths are _returned_, not thrown.

**Acceptance Scenarios**:

1. **Given** a course whose registration opens in the future, **When** a signed-in student
   submits the registration, **Then** they are told registration has not opened yet, and no
   enrollment is created.
2. **Given** a course whose registration deadline has passed, **When** a signed-in student
   submits the registration, **Then** they are told the deadline has passed, and no
   enrollment is created.
3. **Given** an unexpected system failure, **When** a student submits the registration,
   **Then** they see a generic retry message — the generic message survives only for causes
   nobody has written copy for.
4. **Given** any refusal above, **When** the message is shown, **Then** the student stays on
   the course page and is not navigated anywhere.
5. **Given** a submitter holding a session for an account awaiting e-mail verification,
   **When** they submit the registration, **Then** they are told the account is awaiting
   verification, on the course page, and are not sent to the sign-in screen.
6. **Given** a submitter holding a session for a disabled account, **When** they submit the
   registration, **Then** they are told the account is disabled, on the course page, and are
   not sent to the sign-in screen.

---

### Edge Cases

- **A session exists but the account is not in good standing** (awaiting e-mail
  verification, or disabled). Sending them to the sign-in screen cannot help — signing in
  again will not change the account's standing, so a naive "not signed in" answer would
  bounce them in a circle. Each standing gets its own message on the course page instead
  (FR-011).
- **The course disappears or is unpublished between page load and submission.** The student
  is told the course is unavailable rather than shown a success they did not get.
- **The student already has an enrollment for this course.** The course page shows the
  enrollment status instead of the registration control, so this is not normally reachable
  through the UI — and Story 3 now guards the server-side path too (a stale tab, a direct
  call) that the UI's status badge cannot cover.
- **A CANCELLED enrollment for the same course.** Does not count as "already enrolled" — the
  student may register again, and doing so creates a fresh enrollment (FR-016).
- **The two-tab race for a duplicate enrollment.** A check-then-insert done as two separate
  steps can itself race: both requests check, both see nothing, both insert. The guard MUST
  hold even when both submissions are evaluated at nearly the same instant.
- **An enrollment for a different course, same student — or the same course, different
  student.** Unaffected by Story 3's guard, which is scoped to one student and one course
  together.
- **The student edits their profile here, then registration still fails for an unrelated
  reason** (duplicate enrollment, registration window closed). The profile edit already made
  must not be lost — it is a separate action from registering, not bundled into one
  all-or-nothing step (FR-006).
- **A phone number already on file is invalid** (fails the format check used elsewhere in
  this app). Treated the same as blank — invalid is not complete.
- **The visitor has JavaScript disabled.** The registration control already requires it, as
  the sign-in form does. Unchanged by this feature.
- **The visitor reached the course page by its internal folder address rather than its
  public one.** The return destination after signing in is still the public address.

## Requirements _(mandatory)_

### Functional Requirements

**Sign-in gate (Story 1)**

- **FR-001**: The system MUST decide whether the visitor may enrol at the moment the
  enrolment is submitted, as part of performing it. No screen may be shown or withheld on the
  basis of a separate, earlier sign-in check made before the visitor acts.
- **FR-002**: When the submitter is not signed in, the system MUST create no enrollment and
  MUST answer with the sign-in destination to send them to.
- **FR-003**: The sign-in destination MUST carry a return address that brings the visitor
  back to the course page for the course they were registering for.
- **FR-004**: The system MUST derive that return address itself, from the identifier of the
  course being registered for. It MUST NOT accept a return address supplied by the submitter.
- **FR-005**: The return address MUST be the course page's public address
  (`/khoa-hoc/<slug>`), not its internal folder address (`/courses/<slug>`).
- **FR-006** (profile save; also Story 2): On returning to the course page after a successful
  sign-in, the registration control MUST be available to press again. The system MUST NOT
  complete the original registration automatically. A profile correction made per Story 2
  MUST be saved even if the registration attempt that follows it does not succeed for some
  other reason.
- **FR-007**: The screen MUST follow the destination the system returns, and MUST NOT decide
  on its own whether to navigate or which destination to navigate to.
- **FR-011**: A submitter who holds a session but whose account is not in good standing MUST
  NOT be sent to the sign-in screen. Each standing MUST state its own reason on the course
  page: awaiting e-mail verification, and disabled.
- **FR-012**: On a successful registration, the registration control MUST switch to showing
  the enrollment's status immediately, without the student reloading or navigating the page.

**Profile completeness (Story 2)**

- **FR-013**: The course page MUST show the signed-in student's own profile information (full
  name, phone number, email) below the course registration control, whenever that control is
  showing.
- **FR-014**: A student MUST be able to add or correct their full name and phone number in
  that same location, without navigating away from the course page.
- **FR-015**: The system MUST NOT create an enrollment for a student whose full name or phone
  number is missing or invalid, regardless of what the page displayed or what the visitor's
  browser sent — the check is made by the party that creates the enrollment, not assumed from
  an earlier screen (same server-side-gate precedent as FR-001 and FR-018).

**Duplicate guard (Story 3)**

- **FR-016**: The system MUST prevent a student from having more than one active enrollment
  in the same course, no matter which path the second attempt takes (the normal registration
  flow, a second tab, or a direct call to the registration action). A CANCELLED enrollment
  does not count as active.
- **FR-017**: The refusal MUST hold under concurrent submissions for the same student and
  course — a check performed as a separate step before the write MUST NOT be the only
  safeguard, since two such checks can both pass before either write lands.
- **FR-018**: When refused for already being enrolled, the student MUST see a message
  specific to that situation, distinct from every other registration refusal defined in this
  spec (not signed in, account not in good standing, profile incomplete, registration window
  closed, course unavailable, unexpected failure).
- **FR-019**: No enrollment record MUST be created by a refused, duplicate attempt, and the
  student's existing enrollment MUST be unaffected by it — its data and status stay exactly
  as they were.
- **FR-020**: A raw storage-layer error message MUST NOT reach the student under any
  circumstance any refusal in this spec is meant to cover.

**Refusal messaging (Story 4)**

- **FR-008**: Each refusal the system distinguishes — not signed in, account awaiting
  verification, account disabled, profile incomplete, already enrolled, registration window
  not yet open, registration deadline passed, course unavailable — MUST reach the student as
  its own message.
- **FR-009**: The generic retry message MUST be shown only for failures that have no written
  message of their own.
- **FR-010**: A refusal other than "not signed in" MUST leave the student on the course page.

## Key Entities

- **Student session**: whether a visitor is a known, signed-in student, and that account's
  standing (active, awaiting verification, disabled).
- **Course**: the course being registered for. Supplies the registration window that decides
  acceptance and the identifier the return address is built from.
- **Student profile**: the existing full name, phone number, and email already on the
  `Student` record. Stories 1–4 add no new field to it — they add a completeness rule
  (non-blank, valid format) evaluated at the moment of registering.
- **Enrollment**: the record created on success (`student`, `course`, `enrollmentStatus`,
  …). Story 3 adds a rule about how many _active_ enrollments (every status except
  `CANCELLED`) may exist for one `(student, course)` pair: at most one. No new field.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A signed-out visitor can go from pressing the registration button to a created
  enrollment in one sign-in and one further press — no dead ends, no manual re-navigation
  back to the course.
- **SC-002**: 100% of registration attempts by signed-out visitors create no enrollment.
- **SC-003**: After signing in from a registration attempt, 100% of visitors land on the
  course page they started from, at its public address.
- **SC-004**: A submitted request naming an arbitrary return destination cannot change where
  the visitor is sent.
- **SC-005**: A registration attempt costs the visitor one request — no separate sign-in
  status check precedes it.
- **SC-006**: 100% of courses registered for through this flow have a non-blank, validly
  formatted full name and phone number on the registering student's account afterward.
- **SC-007**: A student with an incomplete profile can go from opening the course page to a
  submitted, successful registration without navigating to any other page.
- **SC-008**: A registration attempt bypassing the course page entirely with an incomplete
  profile is refused 100% of the time.
- **SC-009**: 100% of duplicate registration attempts, submitted any number of times for the
  same student and course, result in exactly one enrollment existing for that pair — including
  two submissions arriving at the same instant, with no observable window in which both can
  succeed.
- **SC-010**: 100% of duplicate refusals show the student a specific, plain-language message
  — never a technical or database-level message.
- **SC-011**: Registering for a course with no prior enrollment succeeds exactly as before
  Story 3, with no added delay or new failure mode.
- **SC-012**: Every refusal the system can distinguish reaches the student as a distinct
  message; the generic retry message appears for no refusal that has its own.

## Assumptions

- The course page's public address is `/khoa-hoc/<slug>` and its internal folder address
  `/courses/<slug>` reaches the same page. Linking the public one is an existing repo
  invariant ("A rewritten page has two live paths — link the public one, gate both"), which
  the pre-Story-1 return address violated; FR-005 corrects it.
- Returning the visitor to the course page is enough for the registration control to be
  "ready" — no extra parameter, marker or anchor is added to scroll to or re-open it.
- The registration control requires JavaScript, as the sign-in form already does. No
  no-JavaScript fallback is introduced.
- The sign-in flow's existing handling of a return address — including its rejection of
  off-site destinations — is reused unchanged.
- The site-wide sign-in status check used by the page header is unrelated to this flow and
  stays exactly as it is.
- User-facing copy is Vietnamese, matching every string already on these screens. The
  project's internationalisation decision is still open and this feature does not settle it.
- Statuses an account can hold are: awaiting e-mail verification, active, disabled.
- Email is always present for an existing account (Payload's own auth mechanism requires it
  at sign-up) — "email is required" is therefore already true today for every student who can
  reach this screen; it is shown read-only, never editable, from this location (Clarification
  Q1).
- The phone number format is the one this app already validates elsewhere
  (`VIETNAM_PHONE_REGEX`, `src/lib/validation/profile-schema.ts`) — no second standard was
  introduced.
- Full name and phone are shown per field, automatically, with no click needed to enter edit
  mode: a field that is already complete (non-blank, and for phone, validly formatted)
  displays as plain text, exactly like email; a field that is missing or invalid displays as
  an editable input in its place, immediately. There is no separate "Chỉnh sửa" step (unlike
  `/tai-khoan`'s `ProfileForm`, which edits the whole form at once only after that button is
  pressed).
- A consequence of the rule above: a field that already holds a validly-formatted but
  factually wrong value (a phone number that is someone else's, say) is not editable from
  this screen — only blank or invalidly-formatted values are. Correcting a valid-looking but
  wrong value stays `/tai-khoan`'s job.
- "Active" enrollment, for the purpose of Story 3's guard, is every status except CANCELLED.
- The message for Story 3's refusal is new copy, written for that situation specifically —
  not a reuse of the generic "Không thể đăng ký khóa học. Vui lòng thử lại." message, which
  is reserved for causes with no copy of their own (Story 4).
- Story 3's guard is enforced regardless of who or what submits the registration — there is
  no path (staff action, script, retry) it exempts.
- No duplicate enrollments were known to exist in data when Story 3 shipped; no cleanup or
  migration step for pre-existing duplicates was included.

## Out of Scope

- The sign-in, registration and OTP flows themselves.
- The enrollment data model, notification and confirmation e-mail behaviour, beyond Story 3's
  one new uniqueness rule.
- The sign-in status endpoint used by the page header.
- Cancelling an enrollment (no such flow exists).
- The notification bell (a separate, unrelated feature area — see `specs/010-notification-bell`
  and `specs/011-admin-notification-bell`).
- Any change to how the course page decides to show an existing enrollment's status, or to
  `CourseRegistration`/`Form` beyond surfacing the refusal messages this spec's stories
  add.
- Editing the profile avatar or password from this location.
- Any change to how or whether email can be edited, beyond Clarification Q1 for this one
  screen.
- The existing `/tai-khoan` account page and its own edit flow — unchanged (Clarification
  Q3).

## Clarifications

### Q1 — What happens when a session exists but the account is not in good standing? (resolved 2026-09-14, Story 1)

**Answer**: Its own message on the course page, per standing — awaiting e-mail verification,
and disabled. Neither is sent to the sign-in screen.

**Why**: signing in again cannot change an account's standing, so the "not signed in" answer
would bounce these accounts in a circle. Recorded as FR-011; the option of folding both into
one shared message was rejected because a student awaiting verification can fix that alone
and deserves to be told so.

### Q2 — Does a CANCELLED enrollment block re-registration? (resolved 2026-09-14, Story 3)

**Answer**: No. CANCELLED does not count as active; registering again succeeds and creates a
fresh enrollment.

**Why**: matches what "cancelled" should mean to a student, and avoids a permanent
self-service lock-out with no cancel flow yet to explain why. The guard checks
`enrollmentStatus`, not merely whether a row exists — a plain unique index on
`(student, course)` cannot express this distinction by itself (see `research.md` Decision 1).

### Q3 — Does email become editable on the course page, or stay read-only? (resolved 2026-09-14, Story 2)

**Answer**: Read-only, same as the account page. "Required" is satisfied trivially — every
account that can reach this screen already has one.

**Why**: consistent with the one existing rule this app has about email (`ProfileForm.tsx`,
"Không thể thay đổi"); making it editable here would open a second, contradicting path with
no re-verification story, for a field that never actually blocks registration anyway.

### Q4 — Does profile completeness block the registration server-side, or only guide the UI? (resolved 2026-09-14, Story 2)

**Answer**: A real server-side gate in `createEnrollmentAction` (FR-015 as written, not
softened).

**Why**: matches the precedent Story 1's sign-in gate and Story 3's duplicate guard already
set for their own conditions. A client-only check would leave open exactly the gap this
requirement exists to close: a request that skips the course page could otherwise still
create an enrollment with no way to reach the student.

### Q5 — Reuse the existing profile-edit action, or build one scoped to this screen? (resolved 2026-09-14, Story 2)

**Answer**: A new action/schema scoped to this registration context. `updateProfileAction`
and `profileSchema` (`/tai-khoan`) are left exactly as they are.

**Why**: tightening the shared `profileSchema` to require non-blank values would change
`/tai-khoan`'s own accepted input as a side effect — a screen this feature was not asked to
touch. Some validation logic is duplicated (via a shared factory, `makeProfileSchema` — see
`research.md` Decision 5) rather than shared as one object.
