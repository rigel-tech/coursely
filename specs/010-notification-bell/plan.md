# Implementation Plan: Notification Bell

**Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature; see spec header)

**Date**: 2026-09-14

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-notification-bell/spec.md`

## Summary

The header's decorative bell becomes real: a `GET /next/notifications-count` route feeds a
5-second poll (mirroring `/next/auth-status`'s pattern), and clicking the bell calls a new
`listNotificationsAction` that fetches the most recent 20 and marks exactly that batch
read. `Notifications.access` stays staff-only — every query is a session-scoped Local API
call with `overrideAccess: true`, the same shape every prior feature in this session used.
Notification _creation_ is consolidated into a new `src/notifications/` module mirroring
`src/email/`'s `send.ts`/`templates/` split, and the two existing hand-written write sites
are refactored onto it.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (existing stack — unchanged)

**Primary Dependencies**: none new. Confirmed against the installed Payload types:
`payload.count()` → `{ totalDocs }`, and `payload.update({ where, data })` performs a
bulk update (`BulkOperationResult`) — both already part of the Local API this repo uses
everywhere else.

**Storage**: PostgreSQL — no schema change. Reads and a scoped bulk update against the
existing `notifications` table only.

**Testing**: Vitest — mostly `tests/unit` (services, the action, the component), plus one
`tests/int` case for the new route: `/next/auth-status` (the pattern this route mirrors)
is itself tested in `tests/int/auth-status-route.spec.ts`, not as a unit test, because
exercising a real `GET` handler against a real signed cookie and real Postgres data is
what that test tier is for in this repo — `/next/notifications-count` follows the same
precedent. Existing `tests/int` coverage for the two refactored write sites continues to
exercise them unchanged.

**Target Platform**: Server (one new route, one new server action) + client (a new
`NotificationBell` component rendered by the existing `HeaderAuthControls`)

**Project Type**: Web application (existing single Next.js + Payload project)

**Performance Goals**: the 5-second poll must stay cheap — `payload.count()` only, no row
fetch — so it costs no more than the existing `/next/auth-status` check it already runs
alongside.

**Constraints**: `Notifications.access` must not change (research.md Decision 1); a
signed-out visitor must never poll or see a bell (FR-001); marking read must never touch a
notification the student was not just shown (research.md Decision 3).

**Scale/Scope**: two new server entry points, one new client component, one new
notification-authoring module (2 files to start, one per existing `type`), two refactored
call sites. No schema change, no new screen beyond the header dropdown.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — still holds._

- **Simple first**: the count path is a single `payload.count()`; the list path is a
  `find` + one scoped bulk `update`. No new abstraction beyond the module the user asked
  for by name.
- **Change only what was asked**: `Notifications.access`, the collection schema, and every
  other consumer of `student-registration.ts`/`student-enrollment.ts` besides the two
  notification-writing lines are untouched. The refactor of those two lines was explicitly
  requested, not assumed.
- **Tests — every change**: required/suggested lists go to the user via `AskUserQuestion`
  before any test file is written, per the settled decision — not part of this artifact.
- **Invariants are maintained as you go**: this design's one genuinely new,
  forward-facing, silently-breakable rule is Decision 1/3 together — a future contributor
  loosening `Notifications.access` "to let students read their own" would reopen the
  student-A-reads-student-B hole this plan deliberately avoids by keeping access
  untouched and scoping in the Local API call instead. Candidate INVARIANTS.md entry to
  add during implementation: _"`Notifications.access` stays staff-only; a student reads
  their own only through `student-notifications.ts`'s `overrideAccess: true` + explicit
  `student` scoping — never by widening collection access."_
- **Spec Kit workflow**: followed — `/speckit-specify` → this `/speckit-plan` →
  `/speckit-tasks` → the test-list-then-implement cadence already used for
  specs/007/008/009.

No violations requiring `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/010-notification-bell/
├── plan.md          # This file
├── research.md      # Phase 0 output — 5 decisions
├── data-model.md     # Phase 1 output
└── quickstart.md     # Phase 1 output — 7 scenarios
```

No `contracts/` directory: `/next/notifications-count`'s response shape and
`listNotificationsAction`'s return type are documented in `data-model.md`, matching how
`/next/auth-status` (no contract doc of its own) already sets precedent in this repo.

### Source Code (repository root)

```text
src/
├── notifications/
│   ├── create.ts                          # new — one createNotification(payload, input,
│   │                                          req?) shared by every type (revised
│   │                                          2026-09-14 from one wrapper per type)
│   └── templates/
│       ├── account-created.ts             # new
│       └── enrollment-created.ts          # new
├── services/
│   ├── student-notifications.ts           # new — countUnreadNotifications,
│   │                                          listAndMarkRecentNotifications
│   ├── student-registration.ts            # refactor: inline ACCOUNT_CREATED write ->
│   │                                          accountCreatedNotification + createNotification
│   └── student-enrollment.ts              # refactor: inline ENROLLMENT_CREATED write ->
│                                              enrollmentCreatedNotification + createNotification
├── actions/student/
│   └── notifications.ts                   # new — listNotificationsAction()
├── app/(frontend)/next/
│   └── notifications-count/route.ts       # new — GET -> { count }
└── components/public/
    ├── HeaderAuthControls/index.tsx        # renders NotificationBell instead of the
    │                                          decorative <button>, once authenticated
    └── NotificationBell/index.tsx          # new — poll, popover, list, click-outside

tests/unit/
├── services/student-notifications.spec.ts          # new
├── actions/notifications-action.spec.ts             # new
├── components/notification-bell.spec.tsx            # new
└── components/header-auth-controls.spec.ts          # extend: the known ripple
                                                          (research.md Decision 5)

tests/int/
└── notifications-count-route.spec.ts                # new — mirrors
                                                          auth-status-route.spec.ts
```

**Structure Decision**: single existing project, no restructuring. One new module
(`src/notifications/`), one new service file, one new action file, one new route, one new
component — every other touched file already exists.

## Phase 0 — done

See `research.md`: 5 decisions (read-path access shape; the count-route/list-action split;
scoping the read-marking to exactly the shown batch; the notification-authoring module;
the client component boundary and its test ripple).

## Phase 1 — done

See `data-model.md` (no new entity; the two new read shapes and the module's function
surface) and `quickstart.md` (7 scenarios covering every acceptance scenario and edge case
in spec.md).

## Next

`/speckit-tasks`, then the required/suggested test list via `AskUserQuestion` before any
code — matching specs/007/008/009.
