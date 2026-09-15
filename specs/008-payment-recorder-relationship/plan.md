# Implementation Plan: Payment Recorder Relationship

**Branch**: `008-payment-recorder-relationship` | **Date**: 2026-09-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-payment-recorder-relationship/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Replace `Payments.recordedBy` (plain `number`) with `Payments.userId`, a `relationship`
field to `users`, so the admin Payments list can resolve and display the recording staff
member's name/email — mirroring the existing `studentId` → `StudentCell` pattern. Because
the `payments` table has never been migrated into Postgres (no migration file exists for
it), the new field ships as part of the collection's first-ever migration rather than an
ALTER of live data.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router)

**Primary Dependencies**: Payload CMS 3, `@payloadcms/db-postgres`

**Storage**: PostgreSQL (via Payload's Postgres adapter, migration-driven schema)

**Testing**: Vitest — `tests/unit/collections/payments-config.spec.ts` (field shape, no
infra), `tests/int/payments-collection.spec.ts` (Postgres-backed, `docker compose up -d`)

**Target Platform**: Server (Next.js/Node), Payload admin panel (browser)

**Project Type**: Web application (single Next.js + Payload project, no separate
frontend/backend split)

**Performance Goals**: N/A — admin list rendering for staff-scale usage, no new
performance-sensitive path

**Constraints**: Must not touch the `studentId` column or its `StudentCell` behavior
(FR-005); `userId` stays optional, matching current `recordedBy` (FR-003)

**Scale/Scope**: One collection (`Payments`), one field rename+retype, one new admin cell
component, one generated migration, updates to `payload-types.ts` and `importMap.js`
(both generated — never hand-edited per `CLAUDE.md`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **II. Simple first** — one field changes type/name, one new Cell component copied from
  the existing `StudentCell.tsx` pattern. No new abstraction, no config layer. PASS.
- **III. Change only what was asked** — touches `Payments/index.ts`, a new
  `RecorderCell.tsx` (or similarly named) component, the generated `payload-types.ts` /
  `importMap.js`, and the one migration. `payments-config.spec.ts` and
  `payments-collection.spec.ts` are edited only where they assert the old `recordedBy`
  shape (FR-006 requires this). PASS.
- **IV. Drive to verifiable goals** — FR-001..FR-006 are each independently testable
  (unit: field shape; int: relationship persists/populates; manual: admin list renders
  name/email). Test lists go through the required `AskUserQuestion` gate before any code
  is written (see `tasks.md` step ordering). PASS.
- **Settled: generated files** — `payload-types.ts` and `importMap.js` are regenerated via
  `pnpm generate:types` / `pnpm generate:importmap`, never hand-edited. PASS (tasks.md
  will call these out explicitly as commands, not edits).
- **Settled: agent-driven work goes through Spec Kit** — this plan _is_ that workflow;
  no violation to justify.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── collections/
│   └── Payments/
│       ├── index.ts                    # field: recordedBy(number) → userId(relationship)
│       └── components/
│           ├── StudentCell.tsx         # existing pattern — unchanged
│           └── RecorderCell.tsx        # NEW — same pattern for userId
├── migrations/
│   ├── index.ts                        # NEW entry appended (never reordered/edited by hand)
│   └── <timestamp>_add_payments_collection.ts  # NEW — generated, first payments migration
├── payload-types.ts                    # regenerated — GENERATED, never hand-edited
└── app/(payload)/admin/importMap.js    # regenerated — GENERATED, never hand-edited

tests/
├── unit/collections/
│   └── payments-config.spec.ts         # update recordedBy assertions → userId
└── int/
    └── payments-collection.spec.ts     # extend studentId-relationship-style coverage to userId
```

**Structure Decision**: Single Next.js + Payload project (no frontend/backend split — see
`CLAUDE.md` Structure & commands). All changes are within the existing `Payments`
collection's file tree plus the two generated files it already depends on
(`payload-types.ts`, `importMap.js`).

## Complexity Tracking

_No violations — table not applicable._
