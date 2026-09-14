# Feature Specification: Notification Bell

**Feature Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature)

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "Chuông thông báo hoạt động thật trong header. Header công khai đã có sẵn icon chuông cho người đã đăng nhập, nhưng hiện chỉ là trang trí — không có onClick, không dropdown, một chấm đỏ tĩnh luôn hiện bất kể có thông báo hay không. Yêu cầu: bấm vào chuông thì hiện danh sách thông báo của học viên đó, hiện tại chỗ (dropdown/popover), không điều hướng trang khác. Số lượng thông báo hiển thị dạng số (badge số, không phải chấm), tự cập nhật mỗi 60 giây mà không cần bấm. Ngoài phạm vi: trang xem toàn bộ lịch sử thông báo riêng, thông báo đẩy thời gian thực (chỉ polling), xóa thông báo, cấu hình loại thông báo nào nhận."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Seeing how many notifications are waiting (Priority: P1)

A signed-in student is on any page of the public site. Without doing anything, the bell in
the header shows how many of their notifications are unread, as a number. If a new
notification arrives while they are browsing, that number updates within seconds, with no
reload and no action from them.

**Why this priority**: This is the passive, always-on part of the feature — the whole
reason the bell is worth looking at. Every other requirement exists to let the student act
on what this number tells them.

**Independent Test**: Sign in as a student with unread notifications, confirm the bell
shows the correct count. Create a new notification for that student through an existing
flow (e.g. register for a course) without reloading the page, and confirm the count updates
within 5 seconds.

**Acceptance Scenarios**:

1. **Given** a signed-in student with 3 unread notifications, **When** any page of the
   public site loads, **Then** the bell shows the number 3.
2. **Given** a signed-in student with zero unread notifications, **When** a page loads,
   **Then** the bell shows no count at all (not a zero, not a dot).
3. **Given** a student is on a page with the bell showing a count, **When** a new
   notification is created for them, **Then** the shown count increases within 5 seconds,
   without the page reloading.
4. **Given** a visitor who is not signed in, **When** any page loads, **Then** no bell
   appears at all (unchanged from the sign-in/sign-up links shown today).

---

### User Story 2 - Reading what a notification says (Priority: P2)

A signed-in student clicks the bell. A list of their notifications appears right there,
under the bell — no navigation to another page. Each entry shows what it is about and when
it happened. Reading the list is how the student finds out what changed on their account.

**Why this priority**: The count from Story 1 is only useful if the student can then see
what it refers to; this is the second half of the same feature and depends on Story 1's
bell already existing to click.

**Independent Test**: Click the bell, confirm the notification list appears without leaving
the page, confirm it shows the student's own notifications and nothing navigates away.

**Acceptance Scenarios**:

1. **Given** a signed-in student with notifications, **When** they click the bell, **Then**
   a list of their own notifications appears under the bell, most recent first, and the
   page does not navigate anywhere.
2. **Given** that list is open, **When** the student clicks elsewhere on the page, **Then**
   the list closes.
3. **Given** a student with no notifications at all, **When** they click the bell, **Then**
   the list opens and says plainly that there is nothing to show, rather than appearing
   empty or broken.
4. **Given** two different students, each with their own notifications, **When** either one
   opens their list, **Then** they see only their own notifications, never the other's.

---

### Edge Cases

- **A student's session expires while the list is open or while polling is running.** The
  count/list stop being fetchable; this must fail quietly (e.g. stop polling, or show
  nothing new) rather than surface an error to a page that has nothing to do with sign-in.
- **A very old account with a long notification history.** The list is not expected to show
  unbounded history — see Assumptions for the limit.
- **Two browser tabs open for the same student.** Each polls independently; there is no
  requirement to keep them in sync with each other faster than each tab's own 5-second
  cycle.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST show a signed-in student their own current unread
  notification count as a number on the bell, and MUST NOT show it to a signed-out visitor.
- **FR-002**: The shown count MUST refresh automatically at least once every 5 seconds
  without the student reloading the page or taking any action (revised from 60 seconds
  2026-09-14, at the user's request, after the feature was first built).
- **FR-003**: A student MUST be able to see a list of their own notifications by clicking
  the bell, displayed in place (not a page navigation), most recent first.
- **FR-004**: The notification list and count MUST only ever reflect the signed-in
  student's own notifications — never another student's, regardless of what the client
  requests. The party that answers the request decides whose notifications they are, not
  the request itself.
- **FR-005**: Viewing the notification list MUST mark every notification currently shown in
  it as read; the count MUST reflect this on its next refresh.
- **FR-006**: When a student has no notifications, the list MUST say so explicitly rather
  than appearing empty.

### Key Entities

- **Notification**: existing entity (student, type, title, content, isRead, createdAt).
  This feature adds no new field — it adds a read path scoped to the requesting student,
  and a rule for when `isRead` flips to true (FR-005).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A signed-in student can find out they have a new notification without
  navigating away from whatever page they are on, within 5 seconds of it being created.
- **SC-002**: 100% of notification list views show only that student's own notifications.
- **SC-003**: Opening the notification list and reading it takes no more than the one click
  that opens it — no second action needed to see the content.
- **SC-004**: After viewing the list, the unread count reflects zero newly-read
  notifications on its next refresh (i.e., it drops by exactly what was just shown).

## Assumptions

- Creating a notification is consolidated into one reusable module, mirroring how
  `src/email/` already separates "what a message says" (`templates/`) from "how it gets
  sent" (`send.ts`) — a `createXxxNotification(payload, ...)` per notification type,
  instead of each call site hand-building its own `payload.create({ collection:
'notifications', ... })`. The two existing write sites this feature touches
  (`student-registration.ts`'s `ACCOUNT_CREATED`, `student-enrollment.ts`'s
  `ENROLLMENT_CREATED`) are refactored onto it — same data written, same collection,
  no behaviour change to either flow. This is what makes the module worth building now
  rather than only for the read side: every future feature that raises a notification
  reuses it instead of repeating the same `payload.create` shape a third time.
- The list shows a bounded, recent window of notifications (most recent 20) rather than the
  student's entire history — reasonable default for a header dropdown; no pagination or
  "view all" screen in this feature (explicitly out of scope).
- Polling continues only while the relevant page is open in the browser, exactly like the
  existing `/next/auth-status` check this component already performs — no background
  delivery while the site is closed.
- User-facing copy is Vietnamese, matching every string already on this screen.
- The existing sign-in/sign-out detection in the header (`HeaderAuthControls`) is reused
  unchanged; this feature only adds behaviour for the already-authenticated branch.

## Out of Scope

- A dedicated "all notifications" history page.
- Real-time delivery (WebSocket/SSE) — polling only, per the user's own framing.
- Deleting a notification.
- Per-type notification preferences (opting out of a given `type`).
- Marking a single notification as read/unread individually, independent of viewing the
  list (superseded by FR-005 — viewing marks the shown batch read as a whole; see Q1).

## Clarifications

### Q1 — Does opening the list mark notifications as read, and if so, all at once or one at a time? (resolved 2026-09-14)

**Answer**: Opening the list marks everything currently shown as read, all at once (FR-005
as originally written — no per-item marking).

**Why**: matches how most notification bells behave; no per-item unread indicator or
per-row click handler is needed in the list UI, keeping Story 2 to the one interaction
(click bell, read list) SC-003 already asks for.
