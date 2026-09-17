# Implementation Plan: Enrollment Payments Join

**Branch**: `012-enrollment-payments-join` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-enrollment-payments-join/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

An admin staff member must be able to see every `Payment` linked to a given `Enrollment` on that
enrollment's own detail page, and create new payments directly from there. `Payments.enrollmentId`
changes from a plain `number` field to a `relationship` field pointing at `enrollments` (Postgres
migration required), and `Enrollments` gains a `join` field mirroring the existing
`Courses.objectives`/`Courses.phases` pattern already in this codebase — Payload's own join-field
"create new" drawer then satisfies the add-payment requirement with no bespoke UI code, reusing
`Payments`' existing fields, hooks, and access control untouched.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (per `CLAUDE.md`)

**Primary Dependencies**: Payload CMS 3 (`payload@3.88.0`), `@payloadcms/db-postgres`

**Storage**: PostgreSQL, via a hand-written migration (project convention — `pnpm generate:types`/
migrate, never drizzle-push in prod)

**Testing**: Vitest — `tests/unit/` (collection config shape, no infra) and `tests/int/` (Postgres
required — the actual relationship/join behavior can only be proven against a real FK)

**Target Platform**: Payload admin UI (server + browser), staff-only

**Project Type**: Single Next.js + Payload project (existing structure, no new project)

**Performance Goals**: N/A — admin-only, low-volume CRUD screen; no new performance requirement

**Constraints**: Must not change `Payments`/`Enrollments` access control (both already
staff-only via `authenticated`); must not add a payment-creation path outside the existing
`Payments` collection (FR-006); existing payment rows must remain correctly linked post-migration
(FR-009, zero data loss)

**Scale/Scope**: Two collection config files, one new migration, one hook, `payload-types.ts`
regeneration, associated unit/int test updates

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Tests — every change**: gated by the required `AskUserQuestion` test-selection prompt before
  any code is written (per `CLAUDE.md`) — not yet run; this plan does not write code.
- **Every test is written first and observed red**: applies once tests are selected; no code yet.
- **Simple first / Change only what was asked**: satisfied by design — `enrollmentId` keeps its
  name, no new abstraction layer, no admin component beyond what Payload's `join` field already
  provides (see research.md).
- **UI colour comes from tokens**: N/A — `src/app/(payload)/` and Payload's own `join` field UI
  are admin surfaces, explicitly exempt from the token rules.
- **Invariants maintained as you go**: this feature both _relies on_ an existing invariant ("the
  admin list view always reads relationship fields at `depth: 0`") and must not silently violate
  it for the newly-relationship `enrollmentId` — addressed by extending `populatePaymentRelations`
  (data-model.md). No existing invariant is superseded; nothing here needs a new invariant entry
  beyond what's already documented, since the trap being worked around is already recorded.
- **Agent-driven work goes through Spec Kit**: satisfied — this plan is that workflow.
- **Document IDs are numbers here**: the migration backfill casts the existing `numeric` column
  to `integer` accordingly (data-model.md); no `typeof x === 'string'` check is introduced.

No violations requiring justification — Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/012-enrollment-payments-join/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` — this feature has no external interface of its own; the only "contract" is the
Payload collection schema itself, already captured in data-model.md, and `payload-types.ts` is
generated from it, never hand-written.

### Source Code (repository root)

```text
src/
├── collections/
│   ├── Enrollments/
│   │   └── index.ts                     # + `payments` join field
│   └── Payments/
│       ├── index.ts                     # `enrollmentId`: number → relationship
│       └── hooks/
│           └── populatePaymentRelations.ts  # + resolve `enrollmentId`
├── migrations/
│   ├── index.ts                         # + register new migration
│   └── <timestamp>_convert_payments_enrollment_id_to_relationship.ts
└── payload-types.ts                     # regenerated, never hand-edited

tests/
├── unit/collections/
│   ├── payments-config.spec.ts          # updated for new field type
│   └── enrollments-config.spec.ts       # updated for new join field
└── int/
    └── payments-collection.spec.ts      # updated/extended: FK behavior, join read, create-via-join
```

**Structure Decision**: Existing single Next.js + Payload project structure; no new project or
directory layout introduced. Changes are confined to the two collections already involved, their
migrations, and their existing test files.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_Empty — no violations to justify._
