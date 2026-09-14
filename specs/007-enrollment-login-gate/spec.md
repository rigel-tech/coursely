# Feature Specification: Enrollment Login Gate

**Feature Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature)

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "Đăng ký khóa học yêu cầu đăng nhập — quyết định do backend làm chủ. Bối cảnh: trên trang chi tiết khóa học, học viên bấm 'Đăng ký khóa học'. Hiện tại phía client tự hỏi một endpoint trạng thái đăng nhập rồi tự quyết định điều hướng sang trang đăng nhập hay mở form. Việc này phải chuyển xuống backend. (1) Học viên phải đăng nhập trước khi đăng ký được khóa học. (2) Nếu chưa đăng nhập, hệ thống đưa họ sang màn hình đăng nhập; đăng nhập thành công thì quay lại đúng trang khóa học đó với form đăng ký sẵn sàng để gửi lại. (3) Quyết định 'đã đăng nhập hay chưa' và 'đi đâu tiếp' thuộc về phía máy chủ khi xử lý hành động đăng ký, không phải do form/giao diện tự đoán trước. Ngoài ra: mọi lỗi máy chủ khi đăng ký hiện đều hiển thị chung một câu 'Không thể đăng ký khóa học. Vui lòng thử lại.', mỗi tình huống cần thông báo đúng với nó."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Registering without being signed in (Priority: P1)

A visitor reads a course page and presses the course's registration button. They are not
signed in. Instead of the page guessing that in advance, the request is sent, the system
answers that a signed-in account is required, and the visitor is taken to the sign-in
screen. After signing in successfully they land back on the same course page, with the
registration control ready for them to press again. Pressing it now creates the
enrollment.

**Why this priority**: This is the requested behaviour and the security boundary. Whether
a visitor may enrol is a decision that must be made when the enrolment is attempted, by
the party that performs it — not predicted by the screen beforehand. Everything else in
this feature is refinement of what the answer says.

**Independent Test**: Sign out, open a course page, press the registration button, confirm
arrival at the sign-in screen, sign in, confirm arrival back on that same course page,
press the button again, confirm the enrollment is created.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor on a course page, **When** they submit the registration,
   **Then** no enrollment is created and they are taken to the sign-in screen.
2. **Given** that visitor on the sign-in screen, **When** they sign in successfully,
   **Then** they arrive back on the course page they started from, at that course page's
   public address, with the registration control available.
3. **Given** a signed-in student on a course page, **When** they submit the registration,
   **Then** the enrollment is created and they are told it succeeded, without any detour
   through the sign-in screen.
4. **Given** a visitor who tampers with the submitted request to name a different return
   destination, **When** the system answers, **Then** the return destination is the course
   page for the course actually being registered for, and nothing else.
5. **Given** a signed-in student whose session expires while the course page is open,
   **When** they submit the registration, **Then** they are taken to the sign-in screen
   and, after signing in, back to that course page.

---

### User Story 2 - Being told what actually went wrong (Priority: P2)

A student presses the registration button and the attempt cannot go through — the
registration window has not opened yet, or it has already closed. Today every one of these
comes back as "Không thể đăng ký khóa học. Vui lòng thử lại.", which tells the student
nothing and invites them to retry something that will never succeed. Each refusal states
its own reason, so the student can tell "come back later", "you have missed it" and
"try again" apart.

**Why this priority**: Independent of Story 1 and shippable on its own, but it is the
reason the gate change is worth doing end to end: moving the decision to the server is
only an improvement if the server's answer actually reaches the student intact.

**Independent Test**: Submit a registration for a course whose registration window has not
opened, and one whose window has closed; confirm each shows its own message, distinct from
the other and from the generic retry message.

**Acceptance Scenarios**:

1. **Given** a course whose registration opens in the future, **When** a signed-in student
   submits the registration, **Then** they are told registration has not opened yet, and
   no enrollment is created.
2. **Given** a course whose registration deadline has passed, **When** a signed-in student
   submits the registration, **Then** they are told the deadline has passed, and no
   enrollment is created.
3. **Given** an unexpected system failure, **When** a student submits the registration,
   **Then** they see a generic retry message — the generic message survives only for
   causes nobody has written copy for.
4. **Given** any refusal above, **When** the message is shown, **Then** the student stays
   on the course page and is not navigated anywhere.
5. **Given** a submitter holding a session for an account awaiting e-mail verification,
   **When** they submit the registration, **Then** they are told the account is awaiting
   verification, on the course page, and are not sent to the sign-in screen.
6. **Given** a submitter holding a session for a disabled account, **When** they submit the
   registration, **Then** they are told the account is disabled, on the course page, and
   are not sent to the sign-in screen.

---

### Edge Cases

- **A session exists but the account is not in good standing** (awaiting e-mail
  verification, or disabled). Sending them to the sign-in screen cannot help — signing in
  again will not change the account's standing, so a naive "not signed in" answer would
  bounce them in a circle. Each standing gets its own message on the course page instead
  (FR-011).
- **The course disappears or is unpublished between page load and submission.** The
  student is told the course is unavailable rather than shown a success they did not get.
- **The student already has an enrollment for this course.** The course page shows the
  enrollment status instead of the registration control, so this is not reachable through
  the UI. Submitting twice from two tabs is not guarded today; this feature does not
  change that. Recorded as a known gap, out of scope — see Out of Scope.
- **The visitor has JavaScript disabled.** The registration control already requires it,
  as the sign-in form does. Unchanged by this feature.
- **The visitor reached the course page by its internal folder address rather than its
  public one.** The return destination after signing in is still the public address.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST decide whether the visitor may enrol at the moment the
  enrolment is submitted, as part of performing it. No screen may be shown or withheld on
  the basis of a separate, earlier sign-in check made before the visitor acts.
- **FR-002**: When the submitter is not signed in, the system MUST create no enrollment and
  MUST answer with the sign-in destination to send them to.
- **FR-003**: The sign-in destination MUST carry a return address that brings the visitor
  back to the course page for the course they were registering for.
- **FR-004**: The system MUST derive that return address itself, from the identifier of the
  course being registered for. It MUST NOT accept a return address supplied by the
  submitter.
- **FR-005**: The return address MUST be the course page's public address
  (`/khoa-hoc/<slug>`), not its internal folder address (`/courses/<slug>`).
- **FR-006**: On returning to the course page after a successful sign-in, the registration
  control MUST be available to press again. The system MUST NOT complete the original
  registration automatically.
- **FR-007**: The screen MUST follow the destination the system returns, and MUST NOT
  decide on its own whether to navigate or which destination to navigate to.
- **FR-008**: Each refusal the system distinguishes — not signed in, account awaiting
  verification, account disabled, registration window not yet open, registration deadline
  passed, course unavailable — MUST reach the student as its own message.
- **FR-009**: The generic retry message MUST be shown only for failures that have no
  written message of their own.
- **FR-010**: A refusal other than "not signed in" MUST leave the student on the course
  page.
- **FR-011**: A submitter who holds a session but whose account is not in good standing
  MUST NOT be sent to the sign-in screen. Each standing MUST state its own reason on the
  course page: awaiting e-mail verification, and disabled.

### Key Entities

- **Student session**: whether a visitor is a known, signed-in student, and that account's
  standing. Already exists; this feature only changes who consults it and when.
- **Course**: the course being registered for. Supplies both the registration window that
  decides acceptance and the identifier the return address is built from.
- **Enrollment**: the record created on success. Unchanged by this feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A signed-out visitor can go from pressing the registration button to a
  created enrollment in one sign-in and one further press — no dead ends, no manual
  re-navigation back to the course.
- **SC-002**: 100% of registration attempts by signed-out visitors create no enrollment.
- **SC-003**: After signing in from a registration attempt, 100% of visitors land on the
  course page they started from, at its public address.
- **SC-004**: Every refusal the system can distinguish today reaches the student as a
  distinct message; the generic retry message appears for no refusal that has its own.
- **SC-005**: A registration attempt costs the visitor one request — the separate sign-in
  status check that preceded it is gone from this flow.
- **SC-006**: A submitted request naming an arbitrary return destination cannot change
  where the visitor is sent.

## Assumptions

- The course page's public address is `/khoa-hoc/<slug>` and its internal folder address
  `/courses/<slug>` reaches the same page. Linking the public one is an existing repo
  invariant ("A rewritten page has two live paths — link the public one, gate both"), which
  the current return address violates; FR-005 corrects it.
- Returning the visitor to the course page is enough for the registration control to be
  "ready" — no extra parameter, marker or anchor is added to scroll to or re-open it. This
  was decided with the user before specifying.
- The registration control requires JavaScript, as the sign-in form already does. No
  no-JavaScript fallback is introduced.
- The sign-in flow's existing handling of a return address — including its rejection of
  off-site destinations — is reused unchanged.
- The site-wide sign-in status check used by the page header is unrelated to this flow and
  stays exactly as it is.
- User-facing copy is Vietnamese, matching every string already on these screens. The
  project's internationalisation decision is still open and this feature does not settle it.
- Statuses an account can hold are: awaiting e-mail verification, active, disabled.

## Out of Scope

- The sign-in, registration and OTP flows themselves.
- The enrollment data model, notification and confirmation e-mail behaviour.
- The sign-in status endpoint used by the page header.
- Guarding against a duplicate enrollment submitted twice for the same course. Not guarded
  today; unchanged here.
- Any change to how the course page decides to show an existing enrollment's status.

## Clarifications

### Q1 — What happens when a session exists but the account is not in good standing? (resolved 2026-09-14)

**Answer**: Its own message on the course page, per standing — awaiting e-mail
verification, and disabled. Neither is sent to the sign-in screen.

**Why**: signing in again cannot change an account's standing, so the "not signed in"
answer would bounce these accounts in a circle. Recorded as FR-011; the option of folding
both into one shared message was rejected because a student awaiting verification can fix
that alone and deserves to be told so.
