# Quickstart: Notification Bell

## Prerequisites

```bash
docker compose up -d
pnpm dev
```

## 1 — Count shows and hides correctly (User Story 1)

Sign in as a student with at least one unread notification (register for a course, or
create an account, to generate one via the existing flows). Confirm the bell shows a
number. Mark every notification read via `/admin`, reload, confirm the bell shows no
badge at all — not a zero.

## 2 — Count updates without a reload (scenario 3)

With the bell visible and showing some count, create a new notification for that same
student from another session/tab (e.g. register for a second course). Wait up to 60
seconds without touching the page. Expected: the count increases on its own.

## 3 — Opening the list (User Story 2)

Click the bell. Expected: a list appears under it, in place, most recent first, and the
URL/page does not change. Click elsewhere on the page — the list closes.

## 4 — Empty state (scenario 3)

Sign in as a student with zero notifications ever. Click the bell. Expected: the list
opens and says plainly there is nothing to show.

## 5 — Viewing marks read (FR-005)

Note the count, click the bell, close it, wait for the next 5-second poll (or reload).
Expected: the count has dropped by exactly the number of notifications that were shown.

## 6 — Isolation between students (scenario 4, SC-002)

Sign in as student A with notifications, open the list, note its contents. Sign out, sign
in as student B. Expected: student B's list never contains any of student A's entries.

## 7 — Signed-out visitor sees no bell (scenario 4)

Sign out entirely. Confirm no bell, no count, appears anywhere in the header — unchanged
sign-in/sign-up links only.
