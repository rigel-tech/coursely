# Implementation Plan: Admin Notification Bell

**Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature) | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-admin-notification-bell/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Reuse specs/010's `createNotification`/`Notification` collection for a second audience: staff. A
notification with no `student` is staff-facing and read by every signed-in staff member
(Clarifications Q1). `ACCOUNT_CREATED` is corrected to be one of these (Q2), fixing the
pre-existing copy/storage mismatch. A new client component under `src/components/admin/`,
registered at Payload's `admin.components.actions` slot, polls an unread count and shows the list
on click — talking directly to Payload's own generated REST endpoints for `notifications` (no new
Next.js route or Server Action needed, since staff already pass the collection's own
`authenticated` access check).

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router, Payload CMS 3.88, React 19

**Primary Dependencies**: `@payloadcms/ui` (admin components, `useConfig`, `requests` fetch
helper), `payload/shared` (`formatAdminURL`), existing `src/notifications/create.ts` and
`src/notifications/templates/account-created.ts` (specs/010)

**Storage**: PostgreSQL via `@payloadcms/db-postgres` — one schema change (`notifications.student`
becomes nullable) plus a hand-written migration, see `research.md` Decision 4

**Testing**: Vitest (`tests/unit/`, mocked `fetch`/`getPayload`), `tests/int/` against real
Postgres for the collection-schema and `student-registration.ts` changes

**Target Platform**: Payload admin panel (`/admin`), server-side Next.js for the registration flow

**Project Type**: Single project (existing Next.js + Payload monorepo-style single app)

**Performance Goals**: N/A beyond specs/010's own bar — a 5s poll, one-click list open (SC-003)

**Constraints**: Admin UI must use `@payloadcms/ui` only, no design tokens (constitution's
public/admin UI split); no new access-control bypass — staff read via their existing
`authenticated` access, never `overrideAccess`

**Scale/Scope**: One collection field change, one call-site change, one new admin component, one
migration — no new collections, no new REST/Action surface (research.md Decision 1)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Tests — every change**: not yet run — required/suggested test lists go through
  `AskUserQuestion` before any code, per the non-negotiable rule. Deferred to immediately after
  `/speckit-tasks`.
- **Every test written first, observed red**: will be followed layer-by-layer during
  implementation, matching specs/007–010's rhythm.
- **pnpm only**: no new tooling introduced; unaffected.
- **UI colour from tokens**: the new component lives under `src/components/admin/`, built from
  `@payloadcms/ui` only — outside the token rule by the constitution's own admin/public split, not
  an exception to it.
- **Invariants maintained as you go**: this feature both _uncovers_ a constraint (Payload's REST
  `find` `limit: 0` is not a count — worth an INVARIANTS.md entry if this repo ever reaches for it
  again) and _supersedes_ one (`Notifications.student` required / "staff never receive them" —
  the collection's own module-banner comment is rewritten in the same commit as the field change,
  not left beside it).
- **No agent-session references**: unaffected, applies at commit time.
- **Agent-driven work goes through Spec Kit**: this plan is that workflow.
- **Admin UI is `@payloadcms/ui`, not hand-rolled**: the bell is built from `@payloadcms/ui`
  primitives (icon/button, popover or existing list-item patterns) — no bespoke control unless
  research during implementation finds nothing in that set fits (constitution v1.2.0).

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-admin-notification-bell/
├── plan.md              # This file
├── research.md          # Phase 0 output — REST count/list/mark-read mechanism, schema change
├── data-model.md         # Phase 1 output — Notification field change, CreateNotificationInput change
├── quickstart.md        # Phase 1 output — manual + automated validation checklist
└── tasks.md             # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` directory: this feature adds no new REST/Action contract of its own — it consumes
Payload's own existing, already-documented collection REST endpoints (data-model.md).

### Source Code (repository root)

```text
src/
├── collections/
│   └── Notifications/
│       └── index.ts                      # `student` field: required: true → dropped
├── notifications/
│   └── create.ts                         # CreateNotificationInput.studentId: number → optional
├── services/
│   └── student-registration.ts           # ACCOUNT_CREATED call site drops studentId
├── components/
│   └── admin/
│       └── NotificationBell/
│           └── index.tsx                 # new — admin.components.actions component
├── migrations/
│   ├── 20260914_1XXXXX_make_notification_student_optional.ts   # new
│   └── index.ts                          # registers the new migration
└── payload.config.ts                     # admin.components.actions registration

tests/
├── unit/
│   ├── services/
│   │   └── student-notifications.spec.ts # unaffected — confirmed by data-model.md
│   ├── notifications/
│   │   └── create.spec.ts                # updated: optional studentId, conditional `student` key
│   └── components/admin/
│       └── NotificationBell.spec.tsx     # new — count/list/mark-read against mocked fetch
└── int/
    └── register-action.spec.ts           # updated per accepted ripple (research.md Decision 6)
```

**Structure Decision**: Single project, following the existing layout exactly — no new top-level
directories. The only new directory is `src/components/admin/NotificationBell/`, alongside this
project's other admin components.

## Complexity Tracking

_No violations — table omitted._

## Next

`/speckit-tasks`, then the required/suggested test list via `AskUserQuestion` before any code.
