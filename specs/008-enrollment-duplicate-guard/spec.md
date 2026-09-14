# Feature Specification: Enrollment Duplicate Guard

**Feature Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature)

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "Chặn học viên đăng ký trùng một khóa học. Hiện tại không có gì ngăn một học viên tạo nhiều bản ghi enrollment cho cùng một khóa học — không có ràng buộc unique ở tầng database, không có hook nào kiểm tra trước khi tạo, service không tra cứu enrollment đã tồn tại trước khi insert. Giao diện chỉ 'trông có vẻ' chặn được vì trang khóa học tính enrollmentStatus một lần lúc tải trang — đây là hiển thị, không phải hàng rào. Yêu cầu: một học viên không được có nhiều hơn một enrollment đang hoạt động cho cùng một khóa học. Khi học viên đã có enrollment cho khóa học đó và thử đăng ký lại, hệ thống phải từ chối với một thông báo riêng, không tạo enrollment thứ hai, không để lộ lỗi ràng buộc database thô. Ngoài phạm vi: luồng hủy đăng ký (chưa tồn tại), các trạng thái enrollment khác, chuông thông báo, giao diện CTA/Form ngoài thông báo lỗi mới."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Stopped from enrolling twice (Priority: P1)

A student who is already enrolled in a course submits the registration for that same
course again — from a second browser tab, a stale page they never reloaded, or by any
other route that reaches the registration action. The system refuses, tells them plainly
they are already enrolled, and creates no second enrollment. Their existing enrollment is
untouched.

**Why this priority**: This is the entire ask. Every other requirement exists to make this
refusal reliable (not just usually true) and legible (not a raw database error).

**Independent Test**: Enrol a student in a course through the normal flow, then submit the
same registration again for the same student and course. Confirm the second attempt is
refused, confirm exactly one enrollment record exists for that student/course pair
afterward, and confirm the first enrollment's data is unchanged.

**Acceptance Scenarios**:

1. **Given** a student with an existing NEW, CONFIRMED, ATTENDED, or COMPLETED enrollment
   in a course, **When** they submit the registration for that course again, **Then** no
   enrollment is created and they are told they are already enrolled.
2. **Given** a student whose only enrollment in a course is CANCELLED, **When** they
   submit the registration for that course again, **Then** a fresh enrollment is created —
   this is not a duplicate.
3. **Given** two submissions for the same student and course arriving at effectively the
   same time (two tabs, a double click), **When** both reach the system, **Then** exactly
   one enrollment exists afterward — the second is refused, not silently dropped and not
   silently duplicated.
4. **Given** a student refused for already being enrolled, **When** the refusal is shown,
   **Then** it names the situation in plain language and does not show a raw database or
   constraint error.
5. **Given** a student enrolling in a course they have never registered for, **When** they
   submit, **Then** nothing about this feature changes the outcome — the enrollment is
   created exactly as it is today.

---

### Edge Cases

- **A CANCELLED enrollment for the same course.** Does not count as "already enrolled" —
  the student may register again, and doing so creates a fresh enrollment (FR-008).
- **The two-tab race (scenario 3 above).** A check-then-insert done as two separate steps
  can itself race: both requests check, both see nothing, both insert. The guard MUST hold
  even when both submissions are evaluated at nearly the same instant, not only when they
  arrive far enough apart for one to see the other's result first.
- **An enrollment for a different course, same student.** Unaffected — the guard is scoped
  to one student and one course together, never a student's enrollments in general.
- **An enrollment for the same course, different student.** Unaffected — two different
  students may each hold their own enrollment in the same course.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST prevent a student from having more than one active
  enrollment in the same course, no matter which path the second attempt takes (the normal
  registration flow, a second tab, or a direct call to the registration action). A
  CANCELLED enrollment does not count as active (FR-008).
- **FR-002**: The refusal MUST hold under concurrent submissions for the same student and
  course — a check performed as a separate step before the write MUST NOT be the only
  safeguard, since two such checks can both pass before either write lands.
- **FR-003**: When refused for already being enrolled, the student MUST see a message
  specific to that situation, distinct from every other registration refusal already
  defined (not signed in, account not in good standing, registration window closed,
  course unavailable, unexpected failure).
- **FR-004**: No enrollment record MUST be created by a refused, duplicate attempt.
- **FR-005**: The student's existing enrollment MUST be unaffected by a refused duplicate
  attempt — its data and status stay exactly as they were.
- **FR-006**: A raw storage-layer error message MUST NOT reach the student under any
  circumstance this feature's refusal is meant to cover.
- **FR-007**: A student registering for a course they hold no enrollment in MUST be
  unaffected by this feature — the existing successful-registration behaviour is unchanged.
- **FR-008**: A student whose only enrollment in a course is CANCELLED MUST be able to
  register for that course again; doing so MUST create a new enrollment, exactly as if
  they held none before.

### Key Entities

- **Enrollment**: existing entity (student, course, enrollmentStatus, …). This feature adds
  no fields to it — it adds a rule about how many _active_ enrollments (every status except
  CANCELLED) may exist for one (student, course) pair: at most one.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of duplicate registration attempts, submitted any number of times for
  the same student and course, result in exactly one enrollment existing for that pair.
- **SC-002**: 100% of duplicate refusals show the student a specific, plain-language
  message — never a technical or database-level message.
- **SC-003**: Two submissions for the same student and course arriving at the same instant
  still leave exactly one enrollment afterward, with no observable window in which both
  can succeed.
- **SC-004**: Registering for a course with no prior enrollment succeeds exactly as before
  this feature, with no added delay or new failure mode.

## Assumptions

- "Active" enrollment, for the purpose of this guard, is every status except CANCELLED.
- The message for this refusal is new copy, written for this situation specifically — not
  a reuse of "Không thể đăng ký khóa học. Vui lòng thử lại." (that generic message is
  reserved for causes with no copy of their own, per the sibling feature
  `specs/007-enrollment-login-gate`).
- This guard is enforced regardless of who or what submits the registration — there is no
  path (staff action, script, retry) this feature exempts.
- No existing duplicate enrollments are known to exist in current data; this feature does
  not include a cleanup or migration step for pre-existing duplicates. If any are found
  when this ships, that is a separate, follow-up concern.

## Out of Scope

- Cancelling an enrollment (no such flow exists yet).
- The notification bell (separate feature).
- Any CourseRegistrationCTA/Form change beyond surfacing the new refusal message the
  backend returns.

## Clarifications

### Q1 — Does a CANCELLED enrollment block re-registration? (resolved 2026-09-14)

**Answer**: No. CANCELLED does not count as active; registering again succeeds and creates
a fresh enrollment (FR-008).

**Why**: matches what "cancelled" should mean to a student, and avoids a permanent
self-service lock-out with no cancel flow yet to explain why. The guard checks
`enrollmentStatus`, not merely whether a row exists — a plain unique index on
(student, course) cannot express this distinction by itself, which the implementation plan
will need to account for.
