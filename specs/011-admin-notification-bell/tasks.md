---
description: 'Task list for Admin Notification Bell'
---

# Tasks: Admin Notification Bell

**Input**: Design documents from `specs/011-admin-notification-bell/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md — all present.

**Tests**: Included, per this repo's constitution — draft here as the "required" list,
finalized only after the user's `AskUserQuestion` sign-off (tick/untick/add). Nothing below
is written before that answer.

**Organization**: One user story in `spec.md` (P1). Foundational work reclassifies
`ACCOUNT_CREATED` and opens up `Notification.student`; the user story is the admin bell
component itself.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Make a staff-facing (no-`student`) notification representable at all, and
correct `ACCOUNT_CREATED` to actually be one — everything the bell will read depends on
this existing first.

### Tests for Foundational changes

- [x] T001 [P] Update `tests/unit/notifications/create.spec.ts` (or create it if it does
      not yet exist as a dedicated file): `createNotification` called without `studentId`
      produces a `payload.create` call whose `data` has no `student` key at all (not
      `student: undefined`); called with `studentId` still includes `student: <id>`.
      Written/updated before T004 — expected to fail to typecheck or assert wrongly
      against today's required `studentId: number`.
- [x] T002 Update `tests/int/register-action.spec.ts`'s existing assertion that a freshly
      registered student's `ACCOUNT_CREATED` notification is stored with
      `student: <that student's id>` — change it to assert the stored row has no
      `student` instead (spec.md's accepted ripple, research.md Decision 6). Written
      before T006 — must fail (red) against today's implementation, which still sets
      `student`.

### Implementation for Foundational

- [x] T003 `src/collections/Notifications/index.ts`: drop `required: true` from the
      `student` field. Rewrite the module banner comment in the same commit — it
      currently asserts "Staff never receive them", which this feature makes false
      (constitution's invariant-maintenance rule: a superseded statement is rewritten,
      never left beside the new one).
- [x] T004 `src/notifications/create.ts`: `CreateNotificationInput.studentId` becomes
      `studentId?: number`; build `data` so `student` is included only when `studentId`
      is present (conditional spread, not `student: input.studentId ?? undefined`
      — research.md Decision 5). Turns T001 green.
- [x] T005 New migration `src/migrations/<timestamp>_make_notification_student_optional.ts`
      following `20260912_000000_drop_students_is_walk_in.ts`'s exact shape: `up` runs
      `ALTER TABLE "notifications" ALTER COLUMN "student_id" DROP NOT NULL;`, `down` runs
      `ALTER TABLE "notifications" ALTER COLUMN "student_id" SET NOT NULL;`. Register it
      in `src/migrations/index.ts` alongside the existing entries.
- [x] T006 `src/services/student-registration.ts`: drop `studentId: student.id` from the
      `createNotification(...)` call for `ACCOUNT_CREATED`, making it staff-facing.
      Turns T002 green. Depends on T004.
- [x] T006a Fix `tests/unit/collections/users-notifications-config.spec.ts`: its
      `'requires student, title and content'` test asserted `student.required === true`
      directly contradicting T003 — discovered when the full unit suite was run as this
      phase's checkpoint, not in the original draft. Updated to assert `student` is not
      required and reworded the neighbouring test's description, which named the old
      "always belongs to a student" design as fact.

**Checkpoint**: `pnpm typecheck` and `pnpm lint` pass; `tests/int/register-action.spec.ts`
and the new/updated `tests/unit/notifications/create.spec.ts` are green;
`tests/unit/services/student-notifications.spec.ts` still passes unmodified (data-model.md
confirms no change needed there).

---

## Phase 2: User Story 1 - A staff member sees that something needs attention (Priority: P1) 🎯 MVP

**Goal**: A bell in the admin header's top-right shows an unread count for staff-facing
notifications, refreshed at least every 5 seconds, and clicking it shows the list in
place without navigating away.

**Independent Test**: Trigger an event that writes a staff-facing notification (e.g.
register a new student — now `ACCOUNT_CREATED`, per Phase 1), sign in to `/admin` as any
staff member, confirm the bell shows an unread count, click it, confirm the event appears.

### Tests for User Story 1

- [x] T007 [P] [US1] New file `tests/unit/components/admin/notification-bell.spec.tsx`:
      with `fetch` mocked, the component calls
      `GET {apiRoute}/notifications/count?where[student][exists]=false&where[isRead][equals]=false`
      on mount and renders the returned `totalDocs`; renders no badge/zero when
      `totalDocs` is 0; re-fetches every 5 seconds
      (`vi.useFakeTimers({ shouldAdvanceTime: true })` — plain `vi.useFakeTimers()` hangs
      `waitFor`/`findBy*`, per this session's specs/010 finding) and stops polling once
      unmounted.
- [x] T008 [US1] Same file: clicking the bell calls
      `GET {apiRoute}/notifications?where[student][exists]=false&sort=-createdAt&limit=20`
      and renders the returned list in place (no `router.push`/navigation); when that
      response's `docs` is non-empty, follows with
      `PATCH {apiRoute}/notifications?where[id][in]=<returned ids>` body
      `{ isRead: true }` — asserted against the exact ids returned, not "all unread"
      (mirrors `listAndMarkRecentNotifications`'s tested behaviour); when `docs` is
      empty, no `PATCH` call is made at all.
- [x] T008a [US1] New file `tests/int/notification-audience-isolation.spec.ts` (real
      Postgres): seed one staff-facing notification (`student` absent) and one
      student-facing notification for a real seeded student; confirm
      `GET {apiRoute}/notifications/count?where[student][exists]=false&where[isRead][equals]=false`
      counts only the staff-facing one, and `student-notifications.ts`'s
      `countUnreadNotifications(studentId)` counts only that student's own — proving
      FR-003/SC-002 against real data, not just the data-model.md argument that
      `equals: id` can never match a null `student`. (User-requested addition, not in
      the original draft.)

### Implementation for User Story 1

- [x] T009 [US1] Create `src/components/admin/NotificationBell/index.tsx` — `'use
    client'`, built from `@payloadcms/ui` only (icon/button/popover primitives already
      in that package; no bespoke control unless none fits). Uses `useConfig()` for
      `config.routes.api`, `formatAdminURL` (from `payload/shared`) to build each URL,
      and `requests.get`/`requests.patch` (from `@payloadcms/ui`'s `utilities/api`,
      already `credentials: 'include'`) for the three calls in data-model.md. Polls the
      count every 5 seconds; fetches the list and marks it read on click. Turns T007/T008
      green.
- [x] T010 [US1] Register the component in `payload.config.ts`:
      `admin.components.actions: ['@/components/admin/NotificationBell#NotificationBell']`.
- [x] T011 [US1] Run `pnpm generate:importmap` to regenerate
      `src/app/(payload)/admin/importMap.js` (standing generated-drift file — not
      hand-edited, per this project's own rule).
- [x] T012 [US1] Add an INVARIANTS.md entry: Payload's REST/Local `find`'s `limit: 0`
      disables pagination and returns every matching row — it is not a cheap count; use
      the collection's `/count` REST endpoint or Local API `payload.count()` instead.
      Same commit as T009, per the constitution's rule that work uncovering a
      silently-breaking constraint records it while implementing.

**Checkpoint**: `quickstart.md`'s manual validation steps all pass; the admin bell is
fully functional and independently testable per spec.md's Independent Test.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [x] T013 [P] `rm -f tsconfig.tsbuildinfo` then `pnpm lint`, `pnpm typecheck`,
      `pnpm test:unit` all green.
- [x] T014 `docker compose up -d` then
      `npx vitest run --config ./vitest.config.mts tests/int --no-file-parallelism` green
      (covers T002/T006's `register-action.spec.ts` change). Ran against
      `docker-compose.local.yml` (port 5433) — the actual dev/test stack; the default
      `docker-compose.yml` is a separate prod-like stack on port 5432 and was not touched.
- [ ] T015 Walk through `quickstart.md`'s manual validation steps 1-5 end to end. Partial:
      no browser-automation tool is available in this session, so this could not be
      driven directly. Checked instead via an already-running dev server's own log
      (`.next/dev/logs/next-development.log`): `/admin` returns 200, the import map
      picked up `NotificationBell` after `generate:importmap`, and one transient
      `chunk.reason.enqueueModel is not a function` error appeared in Payload's own
      `DefaultTemplate` at the exact moment the new `actions` component was hot-reloaded
      in — every page load before and after it (several, over the following minutes) was
      clean, consistent with a one-off Turbopack/RSC HMR artifact from injecting a new
      slot into an already-running dev server, not a defect in `NotificationBell` itself.
      **A real click-through in a browser (steps 1-5) still needs a human to confirm.**

---

## Dependencies & Execution Order

- **Foundational (Phase 1)**: no dependencies beyond the existing codebase — blocks
  Phase 2 entirely (the bell has nothing staff-facing to read until `ACCOUNT_CREATED` is
  reclassified and `student` is optional).
- **User Story 1 (Phase 2)**: depends on Phase 1 completing. T009 depends on T007/T008
  (red first). T010/T011 depend on T009 existing as a file to reference.
- **Polish (Phase 3)**: depends on Phase 1 and Phase 2 both complete.

## Parallel Example: Foundational

```text
Task: "Update tests/unit/notifications/create.spec.ts for optional studentId"      (T001)
Task: "Update tests/int/register-action.spec.ts's ACCOUNT_CREATED assertion"        (T002)
```

## Parallel Example: User Story 1

```text
Task: "Unit test: NotificationBell count fetch + polling"    (T007)
```

(T008 shares T007's file and is written immediately after it, not in parallel.)

## Implementation Strategy

Single user story — there is no smaller MVP slice than "Phase 1 + Phase 2" together: a
bell with nothing staff-facing to show (skip Phase 1) or staff-facing data nobody can see
yet (skip Phase 2) are both incomplete deliveries. Ship both phases as one unit, validate
with `quickstart.md`, then Polish.
