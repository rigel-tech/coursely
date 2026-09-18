# Implementation Plan: Payment Record Collection

**Branch**: `007-payment-record` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-payment-record/spec.md`

## Summary

Add a new Payload CMS collection, `payments`, that lets authenticated staff record individual
tuition payments received from students (amount, method, date, optional proof image and
note). `enrollmentId`, `studentId`, and `recordedBy` are plain numeric identifiers in this
iteration — no relationship/foreign key is wired yet, and `payment_status` is explicitly out
of scope (it belongs to a future enrollment-level feature). Every field label is bilingual
(Vietnamese/English), matching the collections built most recently in this repo.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), Payload CMS 3

**Primary Dependencies**: `payload`, `@payloadcms/db-postgres`, `@payloadcms/ui` (admin,
if any custom component were needed — none is for this feature)

**Storage**: PostgreSQL via `@payloadcms/db-postgres` (auto-generates the `payments` table
and migration)

**Testing**: Vitest — `tests/unit/` (no infra) and `tests/int/` (needs `docker compose up -d`
Postgres), per `CLAUDE.md`

**Target Platform**: Server (Node.js) — Payload admin panel + auto-generated REST/GraphQL API

**Project Type**: Single project (web app with embedded CMS) — Option 1 below

**Performance Goals**: None beyond standard CRUD on a low-volume internal table (no special
target; see spec SC-001 for the only relevant metric)

**Constraints**: None beyond the explicit scope limits in the spec (no relationships yet, no
`payment_status` field)

**Scale/Scope**: Internal admin tool, single collection, single-digit staff users at a time,
expected low thousands of rows/year

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Relevant `CLAUDE.md` "Settled decisions" gates for this feature:

| Gate                                                                         | Status                              | How it's met                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent-driven work goes through Spec Kit                                      | ✅                                  | This plan; started at `/speckit-specify`                                                                                                                                                                                                                                                                                                                     |
| Tests — every change, required/suggested lists settled via `AskUserQuestion` | ⏳ Deferred to `/speckit-tasks`     | Not yet run — happens before any code is written                                                                                                                                                                                                                                                                                                             |
| Every test written first and observed red                                    | ⏳ Deferred to `/speckit-implement` | N/A until tasks/tests are drafted                                                                                                                                                                                                                                                                                                                            |
| `pnpm` only                                                                  | ✅                                  | All commands in quickstart.md use `pnpm`                                                                                                                                                                                                                                                                                                                     |
| UI colour comes from tokens                                                  | N/A                                 | This is Payload admin _config_ (field definitions), not a hand-built UI component — no colour/markup is authored                                                                                                                                                                                                                                             |
| Tokens govern public UI only / admin uses `@payloadcms/ui`                   | N/A                                 | No custom admin component is being built; stock Payload field types only                                                                                                                                                                                                                                                                                     |
| `src/payload-types.ts` / `importMap.js` are generated, never hand-edited     | ✅                                  | quickstart.md step 1 regenerates both via `pnpm generate:*`                                                                                                                                                                                                                                                                                                  |
| Invariants maintained as you go                                              | ⏳ Deferred to `/speckit-implement` | The plain-number, no-relationship shape of `enrollmentId`/`studentId`/`recordedBy` is a **forward-facing, silently-breaking** trap once real relationships exist elsewhere (e.g. code assuming Payload will auto-populate them) — candidate INVARIANTS.md entry to add _while implementing_, not now (not true of the codebase until this collection exists) |
| No agent-session references in commits/PRs                                   | ✅                                  | Applies at commit time, not design time                                                                                                                                                                                                                                                                                                                      |
| UI language / i18n: [UNDECIDED]                                              | N/A                                 | That note is about localizing public-site _content_; admin field labels use the already-configured `i18n.supportedLanguages: { en, vi }` in `payload.config.ts`, the same mechanism `AuditLogs`/`Classes`/`Notifications` already use                                                                                                                        |
| Comments: three tiers                                                        | ⏳ Applies during implementation    | Module banner only if a non-obvious constraint exists (e.g. the "no relationship yet" trade-off)                                                                                                                                                                                                                                                             |

No violations requiring justification — Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/007-payment-record/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── payments-api.md   # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
src/
├── collections/
│   └── Payments/
│       └── index.ts          # New: CollectionConfig for `payments`
└── payload.config.ts          # Edited: register Payments in `collections: [...]`

tests/
├── unit/
│   └── collections/
│       └── payments-config.spec.ts   # Candidate — settled at /speckit-tasks
└── int/
    └── (candidate access-control test — settled at /speckit-tasks)
```

**Structure Decision**: Single project (this is the only project in the repo — Next.js App
Router with Payload CMS embedded). No new top-level directory; the feature is one new
collection file plus its registration, following the exact shape of every existing
`src/collections/<Name>/index.ts`. No frontend/backend split applies here — this collection
has no public-facing UI, only the Payload admin panel and auto-generated API.

## Complexity Tracking

_No entries — no constitution gate is violated._
