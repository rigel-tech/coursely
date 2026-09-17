# Feature Specification: Student Cancels Their Own Enrollment

**Feature Branch**: `012-student-cancel-enrollment`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: "Cho phép học viên tự hủy đơn đăng ký khóa học của chính mình (trước đây tính năng hủy chưa tồn tại — spec 007-student-enrollment ghi rõ "no such flow exists"). Điều kiện tự hủy: (1) enrollmentStatus phải là NEW hoặc CONFIRMED (không hủy được nếu đã ATTENDED, COMPLETED, hoặc đã CANCELLED); (2) paymentStatus phải là UNPAID (PARTIALLY_PAID và PAID đều chặn hủy vì đã có giao dịch); (3) nếu enrollment đã được xếp lớp (field `class` có giá trị) thì ngày khai giảng của lớp đó (`class.startDate`) phải chưa tới — nếu chưa xếp lớp thì không bị chặn bởi điều kiện này, kể cả khi đã CONFIRMED. Việc xếp lớp (classAssignedAt) không tự nó chặn hủy. Khi hủy thành công: set enrollmentStatus = CANCELLED, ghi cancelledAt = thời điểm hủy, gửi notification + email xác nhận đã hủy cho học viên (mirror đúng pattern notification/email xác nhận đăng ký đang có cho ENROLLMENT_CREATED). Học viên chỉ được hủy đơn của chính mình, không được hủy đơn của người khác. UI: thêm nút "Hủy đăng ký" ngay tại trang chi tiết khóa học, cạnh badge trạng thái đăng ký hiện có (component CourseRegistration) — không tạo trang "khóa học của tôi" riêng. Không cần migration mới vì field cancelledAt đã tồn tại sẵn trong schema enrollments."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Cancel an eligible enrollment (Priority: P1)

A signed-in student who registered for a course, and has not yet paid anything toward it,
changes their mind before the course starts. They cancel the registration themselves, without
contacting staff.

**Why this priority**: This is the entire point of the feature — a student who no longer needs a
seat today has no way to give it up except by asking staff manually. This story alone delivers
the full self-service value.

**Independent Test**: As a signed-in student with an active (`NEW` or `CONFIRMED`), unpaid
enrollment in a course that has not started, use the cancel control on that course's page and
confirm the enrollment is now shown as cancelled and a confirmation is received.

**Acceptance Scenarios**:

1. **Given** a student's enrollment is `NEW` and unpaid, **When** they cancel it, **Then** the
   enrollment becomes cancelled and they receive a cancellation confirmation.
2. **Given** a student's enrollment is `CONFIRMED`, unpaid, and not yet assigned to a class,
   **When** they cancel it, **Then** the enrollment becomes cancelled.
3. **Given** a student's enrollment is `CONFIRMED`, unpaid, and assigned to a class whose start
   date has not yet arrived, **When** they cancel it, **Then** the enrollment becomes cancelled.
4. **Given** a student has just cancelled an enrollment, **When** they view that course again,
   **Then** it no longer shows as an active registration, and they are able to register for the
   same course again if they choose.

---

### User Story 2 - Blocked from cancelling once money has moved (Priority: P2)

A student who has paid anything at all toward their enrollment — in full or in part — tries to
cancel it themselves.

**Why this priority**: This is the guardrail that makes Story 1 safe to ship — without it, a
student could self-cancel out from under a real payment, creating a financial reconciliation
problem for staff. It depends on Story 1's cancel control existing to be blocked by.

**Independent Test**: As a student with a `PARTIALLY_PAID` or `PAID` enrollment, attempt to
cancel it and confirm the attempt is refused with a clear reason, and the enrollment is
unchanged.

**Acceptance Scenarios**:

1. **Given** a student's enrollment shows partial payment, **When** they attempt to cancel it,
   **Then** the cancellation is refused and the enrollment stays exactly as it was.
2. **Given** a student's enrollment shows full payment, **When** they attempt to cancel it,
   **Then** the cancellation is refused and the enrollment stays exactly as it was.

---

### User Story 3 - Blocked once the course has effectively started or already concluded (Priority: P2)

A student tries to cancel an enrollment that is no longer in an early, undecided state — the
course has already begun, run its course, or the enrollment was already cancelled.

**Why this priority**: A second guardrail, independent from the payment one — protects against
cancelling something that is operationally too late to walk back, even if no money changed
hands. Also depends on Story 1's control existing.

**Independent Test**: As a student with an enrollment that is `ATTENDED`, `COMPLETED`, already
`CANCELLED`, or assigned to a class whose start date has passed, attempt to cancel it and confirm
it is refused.

**Acceptance Scenarios**:

1. **Given** a student's enrollment is `ATTENDED`, **When** they attempt to cancel it, **Then**
   the cancellation is refused.
2. **Given** a student's enrollment is `COMPLETED`, **When** they attempt to cancel it, **Then**
   the cancellation is refused.
3. **Given** a student's enrollment is already `CANCELLED`, **When** they attempt to cancel it
   again, **Then** the cancellation is refused (it is already in the state they wanted).
4. **Given** a student's enrollment is unpaid and assigned to a class whose start date has
   already passed, **When** they attempt to cancel it, **Then** the cancellation is refused.

---

### User Story 4 - Cannot cancel another student's enrollment (Priority: P1)

A signed-in student attempts to cancel an enrollment that does not belong to them.

**Why this priority**: A security boundary, not an optional nicety — without it, any signed-in
student could cancel anyone else's course registration. Ranked P1 alongside Story 1 because it
must ship in the same change, not as a follow-up.

**Independent Test**: As a signed-in student, attempt to cancel an enrollment that belongs to a
different student and confirm it is refused and the other student's enrollment is unchanged.

**Acceptance Scenarios**:

1. **Given** a signed-in student, **When** they attempt to cancel an enrollment belonging to a
   different student, **Then** the request is refused and that enrollment is unchanged.
2. **Given** a signed-out visitor, **When** they attempt to cancel any enrollment, **Then** the
   request is refused.

### Edge Cases

- A student attempts to cancel the same eligible enrollment twice in quick succession (e.g. a
  double-click): the second attempt finds the enrollment already cancelled and is refused with
  the "already cancelled" reason — it does not double-fire the cancellation confirmation.
- An enrollment is assigned to a class, but that class's start date is exactly "now" at the
  moment of the attempt: treated as already started (not cancellable) — the boundary favors
  refusing over allowing.
- A student who successfully cancels a course they had no other active registration for is free
  to register for that same course again afterward — cancelling does not blacklist them from it
  (consistent with existing behavior for cancelled enrollments).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST let a signed-in student cancel their own enrollment when it is
  `NEW` or `CONFIRMED`, unpaid, and (if assigned to a class) that class has not yet started.
- **FR-002**: The system MUST refuse the cancellation, leaving the enrollment unchanged, when the
  enrollment has any payment recorded against it (partial or full).
- **FR-003**: The system MUST refuse the cancellation, leaving the enrollment unchanged, when the
  enrollment is `ATTENDED`, `COMPLETED`, or already `CANCELLED`.
- **FR-004**: The system MUST refuse the cancellation, leaving the enrollment unchanged, when the
  enrollment is assigned to a class whose start date has already arrived.
- **FR-005**: The system MUST NOT let a student cancel an enrollment that does not belong to
  them, and MUST NOT let a signed-out visitor cancel any enrollment.
- **FR-006**: On a successful cancellation, the system MUST record that the enrollment is now
  cancelled and record the moment it was cancelled.
- **FR-007**: On a successful cancellation, the system MUST send the student a confirmation
  (in-app notification and email) that their cancellation went through.
- **FR-008**: The system MUST present the cancel action from the same course page where the
  student already sees their registration status, and MUST only offer it when the enrollment is
  currently eligible per FR-001.
- **FR-009**: Every refusal MUST tell the student why the cancellation could not proceed (e.g.
  "already paid," "course already started," "already cancelled"), not a generic failure.
- **FR-010**: Being assigned to a class MUST NOT, by itself, prevent cancellation — only the
  class's start date having passed does.

### Key Entities

- **Enrollment**: A student's registration for a course. Gains the ability to move from an early
  state (`NEW`/`CONFIRMED`) to `CANCELLED` at the student's own initiative, recording when that
  happened.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A student with an eligible enrollment can cancel it themselves, with zero staff
  involvement, 100% of the time.
- **SC-002**: Zero enrollments with any recorded payment are ever cancelled through this
  self-service path.
- **SC-003**: Zero enrollments are cancelled through this path once their assigned class has
  already started.
- **SC-004**: Every successful self-cancellation results in the student receiving a confirmation
  within the same timeframe as today's registration confirmation.
- **SC-005**: Zero enrollments are ever cancelled by a student who does not own them.

## Assumptions

- "Staff member" and "student" access boundaries follow the same authenticated-student
  identification already used by the existing self-registration flow — this feature changes who
  can cancel, not how a student's identity is established.
- The confirmation channel (in-app notification and email) mirrors the existing enrollment
  confirmation pattern in form and timing; no new channel is introduced.
- The cancel control's placement (on the course detail page, beside the existing status badge)
  is the only surface this feature adds; no separate "my enrollments" listing page is in scope.
- A course with no assigned class has no start date to compare against, so an enrollment not yet
  assigned to a class is never blocked by the "course already started" condition — only payment
  status and enrollment status can block it in that case.
- Re-registering for a course after self-cancelling is already supported by existing behavior
  (a cancelled enrollment does not count as an active one) and requires no new work here.

---

## Implementation Plan

_Appended by `/speckit-plan` equivalent — kept in this single file per this repo's convention
(no separate `plan.md`/`research.md`/`data-model.md`)._

### Summary

Add a student-initiated cancellation path mirroring the existing self-registration path
(`create-enrollment.ts` → `student-enrollment.ts`): a pure eligibility check shared between "can
this be shown/cancelled" and "block on the way in", a service function that re-validates and
writes `CANCELLED`, a server action that authenticates and translates typed refusals, and a
button added to the existing `CourseRegistration` status display. One new Postgres migration is
needed (a new `notifications.type` enum value) — everything else is additive TypeScript.

### Technical Context

- **Language/stack**: TypeScript, Next.js App Router, Payload CMS 3, Postgres — unchanged, no new
  dependency.
- **Storage**: one migration — `ALTER TYPE "public"."enum_notifications_type" ADD VALUE
'ENROLLMENT_CANCELLED'` (mirrors the existing `20260914_120000_add_enrollments_collection.ts`
  precedent for adding `'ENROLLMENT_CREATED'`; same "no `down()` for `ADD VALUE`" caveat).
- **Testing**: Vitest — `tests/unit/` for the pure eligibility function, error mapping, and
  collection config; `tests/int/` for the service function against real Postgres (ownership,
  each refusal reason, the successful write, and the notification/email being triggered).

### Files to add

- `src/lib/errors/enrollment.ts` — extend with new error classes, same shape as
  `EnrollmentAlreadyExists`/`CourseNotFound`:
  - `EnrollmentNotFound` — id doesn't resolve, or resolves to a different student's enrollment
    (deliberately the same message/class for both — never confirms another student's enrollment
    exists).
  - `EnrollmentAlreadyCancelled` — `enrollmentStatus` is already `CANCELLED`.
  - `EnrollmentNotCancellable` — `enrollmentStatus` is `ATTENDED` or `COMPLETED`.
  - `EnrollmentHasPayment` — `paymentStatus` is `PARTIALLY_PAID` or `PAID`.
  - `EnrollmentAlreadyStarted` — assigned class's `startDate` has already arrived.
- `src/migrations/<timestamp>_add_enrollment_cancelled_notification_type.ts` — the enum-value
  migration above, registered in `src/migrations/index.ts`.
- `src/notifications/templates/enrollment-cancelled.ts` —
  `createStudentEnrollmentCancelledNotificationTemplate(courseTitle)`, mirrors
  `templates/enrollment-created.ts`.
- `src/email/templates/enrollment-cancelled.ts` — `createEnrollmentCancelledEmailTemplate(courseTitle)`,
  mirrors `email/templates/enrollment-created.ts` (same `escapeHtml` treatment).
- `src/lib/constants/cancel-enrollment-state.ts` — `CancelEnrollmentState`, same
  `{status:'success', message} | {status:'error', message}` shape as `CreateEnrollmentState`.
- `src/actions/student/cancel-enrollment.ts` — `cancelEnrollmentAction(enrollmentId: number)`,
  mirrors `create-enrollment.ts`'s shape: resolve session student (same `STANDING_REFUSAL` check
  for a non-`ACTIVE` account), call the service, map each typed error to its own Vietnamese
  message via an `instanceof` chain, return `CancelEnrollmentState`.

### Files to change

- `src/collections/Notifications/index.ts` — add the `ENROLLMENT_CANCELLED` option to the
  `type` select field (bilingual label, same shape as the existing two options).
- `src/email/send.ts` — add `sendEnrollmentCancellationEmail(payload, { to, courseTitle })`,
  mirrors `sendEnrollmentConfirmationEmail`.
- `src/services/student-enrollment.ts` — add:
  - `isEnrollmentCancellable(enrollment, now = new Date()): boolean` — the pure rule from this
    spec's Requirements, taking whatever shape of `enrollmentStatus`/`paymentStatus`/`class`
    (populated or bare id) the two callers below already have on hand. Exported so both the
    service and the page-level display logic use the exact same rule — the rule is never
    duplicated.
  - `cancelStudentEnrollment({ enrollmentId, student }): Promise<void>` — `findByID` at `depth: 1`
    (to get `class.startDate` without a second query), confirm ownership (else
    `EnrollmentNotFound`), run the specific-reason checks in FR-002/FR-003/FR-004 order (each its
    own error class), `payload.update` to `enrollmentStatus: 'CANCELLED'`,
    `cancelledAt: <now>`, `overrideAccess: true` — then fire the notification and email exactly
    like `notifyEnrollmentCreated` does (fire-and-forget, logged on failure, never blocks the
    response).
  - Extend `getActiveEnrollmentStatus`'s return shape from `enrollmentStatus | undefined` to
    `{ id, enrollmentStatus, canCancel } | undefined` (its only caller today is the course detail
    page) — `canCancel` computed via `isEnrollmentCancellable`, so the page never re-implements
    the rule.
- `src/components/public/CourseRegistration.tsx` — accept `enrollmentId`/`canCancel` alongside
  the existing `enrollmentStatus`; render a "Hủy đăng ký" button beside the status badge when
  `canCancel` is true, wired to `cancelEnrollmentAction`; on success, clear local status back to
  showing the registration form again (mirrors the existing `onSuccess` → `setStatus('NEW')`
  pattern, in reverse).
- `src/app/(frontend)/courses/[slug]/page.tsx` — pass the extended fields through to
  `CourseRegistration`.

### No changes

- `Enrollments.access` — unchanged (`authenticated`, staff-only); the student path keeps using
  the established `overrideAccess: true` + service-level ownership check pattern (same as
  `createEnrollmentAction`/`updateStudentProfile` — never widens collection access for students).
- No new migration for `Enrollments` itself — `cancelled_at`, `enrollment_status`, `payment_status`
  all already exist.
- No "my enrollments" list page — confirmed out of scope.

### Draft test list (for the required/suggested `AskUserQuestion` gate before implementation)

**Likely required**:

- Unit: `isEnrollmentCancellable` — one case per row of the eligibility table (including the
  no-class-assigned case and the exact-`now`-equals-`startDate` boundary).
- Unit: `Notifications` config carries the new `ENROLLMENT_CANCELLED` option, bilingual label.
- Int: `cancelStudentEnrollment` — happy path (NEW/unpaid, CONFIRMED/unpaid/no class,
  CONFIRMED/unpaid/class-not-started) all succeed and set `CANCELLED` + `cancelledAt`.
- Int: `cancelStudentEnrollment` — each refusal reason (payment, terminal/cancelled status,
  class already started, not-owner) throws its specific error and leaves the row unchanged.
- Int: successful cancellation creates the `ENROLLMENT_CANCELLED` notification and triggers the
  email send.

**Likely suggested**: `cancelEnrollmentAction`'s error-to-message mapping (unit, with a stubbed
service); a double-cancel race test (second call sees `CANCELLED` and gets
`EnrollmentAlreadyCancelled`).

_(Final list to be confirmed via the required/suggested `AskUserQuestion` prompt before any code
is written, per `CLAUDE.md`.)_

---

## Implementation Result

All 7 confirmed tests (5 required + 2 suggested) written first, observed red for the right
reason, then implemented to green:

- `src/lib/errors/enrollment.ts` — `EnrollmentNotFound`, `EnrollmentAlreadyCancelled`,
  `EnrollmentNotCancellable`, `EnrollmentHasPayment`, `EnrollmentAlreadyStarted`.
- `src/migrations/20260917_210000_add_enrollment_cancelled_notification_type.ts` — adds the
  `ENROLLMENT_CANCELLED` Postgres enum value; registered in `src/migrations/index.ts`.
- `src/collections/Notifications/index.ts` — new `ENROLLMENT_CANCELLED` option.
- `src/notifications/templates/enrollment-cancelled.ts`,
  `src/email/templates/enrollment-cancelled.ts`, `sendEnrollmentCancellationEmail` in
  `src/email/send.ts`.
- `src/lib/constants/cancel-enrollment-state.ts` — `CancelEnrollmentState`.
- `src/services/student-enrollment.ts` — `isEnrollmentCancellable` (pure),
  `cancelStudentEnrollment`, `notifyEnrollmentCancelled`; `getActiveEnrollmentStatus` extended
  to return `{ id, enrollmentStatus, canCancel }`.
- `src/actions/student/cancel-enrollment.ts` — `cancelEnrollmentAction`.
- `src/components/public/CourseRegistration.tsx` — "Hủy đăng ký" button (destructive variant,
  `window.confirm` guard) shown when `canCancel`; `src/app/(frontend)/courses/[slug]/page.tsx`
  passes the extended fields through.

**Verified**: `pnpm test:unit` 82/82 files, 438/438 tests green. `pnpm test:int` 22/22 files,
130/130 tests green (including all cancel-enrollment cases: 3 success paths, 6 refusal reasons,
notification+email creation, double-cancel race). `pnpm typecheck` clean. `pnpm lint` 0 errors
(pre-existing warnings only), `theme-guard` 0 violations.

**Not verified this session**: the admin UI button/flow in a real browser (no browser automation
tool available) — the data-layer behavior (service + action + eligibility rule) is fully covered
by tests; a manual pass in `/courses/<slug>` as a signed-in student is recommended before
merging. `pnpm payload migrate` has not been run against a real-data database — required before
deploying to any environment with existing `notifications` rows.

---

## Bug Fix — cancel button not showing right after registering

**Report**: after successfully registering for a course, the cancel button did not appear
until a reload. **Root cause**: `createStudentEnrollment` returned `void`, so
`createEnrollmentAction`'s success state carried no enrollment id, and
`CourseRegistration`'s post-submit handler only set the status badge, never the id/`canCancel`
needed to show the button.

**Fix** (3 required tests written first, observed red, then green):

- `createEnrollment`/`createStudentEnrollment` (`student-enrollment.ts`) now resolve the new
  enrollment's id instead of `void`.
- `CreateEnrollmentState`'s success variant gained `enrollmentId: number`;
  `createEnrollmentAction` returns it.
- `CourseRegistrationForm`'s `onSuccess` now receives that id.
- `CourseRegistration` tracks `id`/`cancellable` as local state, seeded from props; a
  successful registration sets both directly — a fresh registration is always `NEW` + unpaid +
  no class, `isEnrollmentCancellable`'s base true case, so no extra round trip is needed to
  know it is cancellable.

**Verified**: `pnpm test:unit` 82/82 files, 439/439 tests green (new: service returns id, action
returns `enrollmentId`, cancel button appears immediately post-registration; existing tests
touching `createStudentEnrollment`'s return value updated to match). `pnpm typecheck` clean.
`pnpm lint` 0 errors.
