# Feature Specification: Admin Notification Bell

**Feature Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature)

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "Tái sử dụng module thông báo cho trang admin — thêm icon chuông ở bên phải header admin. Feature 010 đã xây module src/notifications/ và chuông thông báo cho học viên ở header công khai. Yêu cầu mới: tái sử dụng module đó cho phía nhân viên (staff) trong trang /admin — thêm một icon thông báo ở bên phải header admin, khi bấm hiện danh sách thông báo dành cho nhân viên. Ngoài phạm vi: trang xem toàn bộ lịch sử thông báo admin riêng, real-time, xóa thông báo, phân quyền xem thông báo theo vai trò nhân viên."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A staff member sees that something needs attention (Priority: P1)

A staff member is working anywhere in the admin panel. A bell in the top-right of the
admin header shows how many staff-facing notifications are unread. Clicking it shows the
list — what happened, and when — without leaving whatever admin screen they were on.

**Why this priority**: This is the entire ask: staff currently have no way to learn "a new
student registered" or similar events except by browsing collections directly. Everything
else in this feature exists to deliver this one capability using what specs/010 already
built.

**Independent Test**: Trigger an event that already writes a staff-facing notification
(see Clarifications), sign in to `/admin` as any staff member, confirm the bell shows an
unread count, click it, confirm the event appears in the list.

**Acceptance Scenarios**:

1. **Given** a staff-facing notification exists and is unread, **When** any staff member
   opens any page of `/admin`, **Then** the bell in the header's top-right shows it is
   there (a count, consistent with how specs/010 already renders one).
2. **Given** a staff member clicks the bell, **Then** the notification list appears in
   place — no navigation to a different admin screen.
3. **Given** two different staff members both sign in to `/admin`, **When** either opens
   the list, **Then** both see the same staff-facing notifications — this is not scoped
   per staff member (see Clarifications Q1).
4. **Given** a student signs in to the public site, **When** they use their own
   notification bell (specs/010), **Then** they never see a staff-facing notification, and
   a staff member's admin bell never shows a student-facing one.

---

### Edge Cases

- **A staff-facing and a student-facing notification exist side by side.** Each bell (the
  public one from specs/010, the admin one from this feature) shows only its own audience's
  notifications — never the other's. This is what Clarifications Q1/Q2 make possible to
  state precisely.
- **No staff-facing notifications exist yet.** The admin bell shows no count, matching how
  the public bell already behaves with zero (specs/010, FR-001 scenario 2).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The admin panel's header MUST show a notification icon in its top-right
  area, visible to any signed-in staff member on every admin screen.
- **FR-002**: Clicking the icon MUST show the list of staff-facing notifications in place,
  without navigating to a different admin screen.
- **FR-003**: A staff-facing notification MUST never appear on a student's own
  notification bell (specs/010), and a student-facing notification MUST never appear on
  the admin bell — the two audiences are always kept apart.
- **FR-004**: Creating a staff-facing notification MUST reuse the existing
  `createNotification` function (specs/010) — this feature does not introduce a second way
  to write a notification row.

### Key Entities

- **Notification**: existing entity (specs/010). `student` becomes optional — a
  notification with no `student` is staff-facing, read by every signed-in staff member
  (Q1). `ACCOUNT_CREATED` is reclassified to always be one of these (Q2); no new
  notification type is introduced by this feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can learn about a staff-facing event without navigating away
  from whatever admin screen they are on.
- **SC-002**: 100% of staff-facing notifications are invisible from every student's own
  notification bell, and vice versa.
- **SC-003**: Opening the admin notification list takes exactly one click, matching
  specs/010's own SC-003 for the public bell.

## Assumptions

- The admin bell is a Payload admin-panel component (`admin.components.actions`), built
  with `@payloadcms/ui` per this project's own rule that admin UI does not use the public
  site's design tokens — it is a different visual system by settled decision, not an
  oversight this feature corrects.
- Staff already have standing access to read the `notifications` collection today
  (`Notifications.access` uses `authenticated`, which admits `users`, i.e. staff) — this
  feature does not need to add any new access-control path the way specs/010 did for
  students; it only needs to scope which rows count as staff-facing (Q1: no `student`
  set).
- Every staff member sees the same list, and "read" is shared across the whole team, not
  per-person (Q1) — matches how a shared inbox behaves.
- User-facing copy is Vietnamese, matching every string already in this admin panel.

## Out of Scope

- A dedicated "all admin notifications" history screen.
- Real-time delivery — polling (or no live-refresh at all, if Q1/Q2 settle on a simpler
  shape) only, consistent with specs/010's own scope line.
- Deleting a notification.
- Per-role notification visibility (every signed-in staff member sees the same list,
  regardless of role).

## Clarifications

### Q1 — Who exactly receives a staff-facing notification? (resolved 2026-09-14)

**Answer**: Broadcast — every signed-in staff member sees every staff-facing
notification. No per-staff ownership, no per-staff read state; a notification with no
`student` set is staff-facing, matching how `ACCOUNT_CREATED`'s own copy already reads.

**Why**: nothing in this app tracks "which staff member should handle this student
event" — self-registration has no staff actor to assign it to. A shared inbox is both the
simpler model and the one the existing copy already assumes.

### Q2 — Does `ACCOUNT_CREATED` get reclassified as staff-facing? (resolved 2026-09-14)

**Answer**: Yes — `ACCOUNT_CREATED` is corrected to be a staff-facing (broadcast)
notification, matching what its own copy has always said. It stops being written to the
newly-registered student's own notification list.

**Why**: the mismatch was real (copy reads staff-facing, stored student-facing) and this
feature is precisely the point at which staff-facing notifications start existing at all
— deferring the fix would mean shipping a _second_, differently-purposed type instead of
correcting the one that already says what this feature needs it to say.

**Accepted ripple**: a student who registers will no longer see "Có người dùng đăng ký
tài khoản mới" on their own bell (specs/010) — that string was never meaningfully
addressed to them. `tests/int/register-action.spec.ts`'s existing assertion about this
notification's `student` field needs updating to match (see `plan.md`).
