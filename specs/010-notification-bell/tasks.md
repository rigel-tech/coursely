---
description: 'Task list for Notification Bell'
---

# Tasks: Notification Bell

**Input**: Design documents from `specs/010-notification-bell/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md — all present.

**Tests**: Included, per this repo's constitution — draft here as the "required" list,
finalized only after the user's `AskUserQuestion` sign-off (tick/untick/add). Nothing below
is written before that answer.

**Organization**: Two user stories in `spec.md` (P1, P2).

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The notification-authoring module (requested explicitly, independent of which
user story reads afterward) and the session-scoped read service both stories build on.

- [ ] T001 [P] Create `src/notifications/templates/account-created.ts` — pure function
      returning `{ title, content }` for `ACCOUNT_CREATED`, matching the copy currently
      inline in `student-registration.ts`.
- [ ] T002 [P] Create `src/notifications/templates/enrollment-created.ts` — same, for
      `ENROLLMENT_CREATED`, matching `student-enrollment.ts`'s current copy.
- [ ] T003 Create `src/notifications/create.ts`: one `createNotification(payload, {
    studentId, type, title, content, metadata? }, req?)` — a single
      `payload.create({ collection: 'notifications', ... })` wrapper shared by every
      type, not one wrapper per type (revised 2026-09-14 from the original two-function
      design, at the user's request — reusable wherever a notification is raised, admin-
      or student-triggered alike). Depends on T001, T002 only for the templates each
      caller pulls `title`/`content` from before calling this function.
- [ ] T004 Refactor `src/services/student-registration.ts`'s inline `ACCOUNT_CREATED`
      write to call `accountCreatedNotification` then `createNotification`. No behaviour
      change — same data, same collection, same transaction/`req`. Depends on T003.
- [ ] T005 Refactor `src/services/student-enrollment.ts`'s inline `ENROLLMENT_CREATED`
      write to call `enrollmentCreatedNotification` then `createNotification`. Same
      constraint as T004. Depends on T003.
- [ ] T006 [P] Create `src/services/student-notifications.ts`:
      `countUnreadNotifications(studentId)` (→ `payload.count`) and
      `listAndMarkRecentNotifications(studentId)` (→ `payload.find`, most recent 20, then
      `payload.update({ where: { id: { in: ids } } })` scoped to exactly those ids —
      research.md Decision 3). Both `overrideAccess: true`, scoped by
      `student.equals(studentId)`. `Notifications.access` itself is not touched.
- [ ] T007 Add the INVARIANTS.md entry drafted in `plan.md`'s Constitution Check —
      `Notifications.access` stays staff-only; a student reads their own only through
      `student-notifications.ts`'s scoped `overrideAccess` calls, never by widening
      collection access. Same commit as T006.

**Checkpoint**: `pnpm typecheck` passes; the two refactors (T004/T005) keep existing
`tests/int` coverage for registration/enrollment green before any new test is added.

---

## Phase 2: User Story 1 - Seeing how many notifications are waiting (Priority: P1) 🎯 MVP

**Goal**: A signed-in student sees their unread count on the bell, refreshed at least
every 5 seconds, with no bell at all when signed out.

**Independent Test**: Sign in with unread notifications, confirm the bell shows the right
number; create a new one without reloading, confirm the number updates within 5 seconds.

### Tests for User Story 1

- [ ] T008 [P] [US1] Unit test in `tests/unit/services/student-notifications.spec.ts`:
      `countUnreadNotifications` counts only the given student's unread notifications
      (scoping proven the same way specs/008's duplicate-guard tests proved theirs — assert
      the `where` clause, not just a mocked total).
- [ ] T009 [US1] Int test, new file `tests/int/notifications-count-route.spec.ts` —
      mirroring `tests/int/auth-status-route.spec.ts`'s exact shape (real Postgres, a
      seeded student, `signAccessToken` + the mocked `next/headers` cookie jar): a
      signed-in student with N unread notifications gets `{ count: N }`; no cookie gets
      `{ count: 0 }`. Needs `docker compose up -d`; not parallel with the other US1 tests
      since it is a different test tier.
- [ ] T010 [P] [US1] Unit test, new file
      `tests/unit/components/notification-bell.spec.tsx`: renders no bell when
      unauthenticated; renders the count when authenticated and count > 0; renders no
      badge at all when count is 0 (FR-001, scenario 2); polls again after 5 seconds
      using fake timers, and stops polling on unmount.

### Implementation for User Story 1

- [ ] T011 [US1] Create `src/app/(frontend)/next/notifications-count/route.ts` — `GET`,
      mirroring `/next/auth-status`'s structure: resolve `getSessionStudent()`, call
      `countUnreadNotifications`, return `{ count }` (or `{ count: 0 }` when signed out).
- [ ] T012 [US1] Create `src/components/public/NotificationBell/index.tsx` — count state,
      `setInterval` poll of the new route every 5 000 ms, cleared on unmount, numeric
      badge shown only when count > 0.
- [ ] T013 [US1] Wire `NotificationBell` into `HeaderAuthControls`'s authenticated branch,
      replacing today's decorative `<button>`.
- [ ] T014 [US1] Update `tests/unit/components/header-auth-controls.spec.ts`'s "calls the
      status endpoint exactly once" test for the new second fetch call (research.md
      Decision 5's known ripple) — without weakening what it originally proved about
      `/next/auth-status` itself.

**Checkpoint**: Story 1 is fully functional and independently testable — quickstart.md §1,
§2, §7.

---

## Phase 3: User Story 2 - Reading what a notification says (Priority: P2)

**Goal**: Clicking the bell shows the student's own recent notifications in place, marks
them read, and says so plainly when there are none.

**Independent Test**: Click the bell, confirm the list appears without navigation, shows
only that student's own notifications, and an empty account sees an explicit empty state.

### Tests for User Story 2

- [ ] T015 [P] [US2] Unit test in `tests/unit/services/student-notifications.spec.ts`:
      `listAndMarkRecentNotifications` returns the most recent 20 for the given student
      only, sorted newest-first, and marks exactly those returned ids as read — a second
      student's unread notifications, and any beyond the 20th for the same student, are
      untouched (research.md Decision 3).
- [ ] T016 [P] [US2] Unit test, new file
      `tests/unit/actions/notifications-action.spec.ts`: `listNotificationsAction` returns
      the signed-in student's list; returns an empty array for a signed-out caller rather
      than throwing.
- [ ] T017 [P] [US2] Unit test in `tests/unit/components/notification-bell.spec.tsx`:
      clicking the bell opens the list and calls the action; an empty list shows the
      explicit "nothing to show" message, not a blank panel; clicking outside the open
      list closes it.

### Implementation for User Story 2

- [ ] T018 [US2] Create `src/actions/student/notifications.ts` —
      `listNotificationsAction()`: resolve `getSessionStudent()`, return `[]` if none,
      else call `listAndMarkRecentNotifications`.
- [ ] T019 [US2] Extend `NotificationBell` with the click-to-open popover: fetch the list
      on open, render entries (title, content, relative time), the empty-state message,
      and a click-outside handler that closes it.

**Checkpoint**: Both stories work together — quickstart.md §3–§6.

---

## Final Phase: Polish

- [ ] T020 [P] `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` — all green.
- [ ] T021 Walk `quickstart.md` once by hand against a dev database.

---

## Dependencies & Execution Order

- **Foundational (Phase 1)** blocks both stories. T001/T002 parallel; T003 depends on both;
  T004/T005 depend on T003 and touch different files so may run in parallel with each
  other; T006 is independent of T001–T005 (different files, different concern) and may run
  in parallel with the whole T001–T005 chain; T007 is paired with T006.
- **User Story 1 (Phase 2)** depends on Foundational. Tests (T008–T010) before
  implementation (T011–T014); T008 depends on T006 existing to test against; T009 depends
  on T006; T010 can be written against the not-yet-existing component (red for the right
  reason) before T012.
- **User Story 2 (Phase 3)** depends on Foundational; does not depend on Story 1's tasks
  completing, but shares `NotificationBell`'s file with it — sequenced after Story 1 in
  this plan to avoid two people editing the same new file at once, not because of a data
  dependency.
- **Polish** depends on both stories being complete.

## Parallel Example: Foundational

```text
Task: "Create src/notifications/templates/account-created.ts"     (T001)
Task: "Create src/notifications/templates/enrollment-created.ts"  (T002)
Task: "Create src/services/student-notifications.ts"              (T006)
```

## Parallel Example: User Story 1 tests

```text
Task: "Unit test — countUnreadNotifications scoping"          (T008)
Task: "Unit test — GET /next/notifications-count"             (T009)
Task: "Unit test — NotificationBell count + polling"          (T010)
```

## Implementation Strategy

Foundational → Story 1 (MVP: the count alone already delivers SC-001) → Story 2 (the list
that makes the count actionable) → Polish, matching how specs/007/008/009 were each carried
out in stages with a sign-off between them.
