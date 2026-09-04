---
description: 'Task list for Medium hero two-column layout'
---

# Tasks: Medium hero two-column layout

**Input**: Design documents from `specs/003-hero-split-layout/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/hero-medium-layout.md, quickstart.md

**Tests**: Requested. Final test list settled via `AskUserQuestion` on 2026-09-04 — exactly two required tests (below). DOM-order, no-throw, and all suggested tests were **unticked** and are out of scope.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 from spec.md

## Path Conventions

Single Next.js project. Component under `src/heros/`, unit tests under `tests/unit/components/`.

---

## Phase 1: Setup

No setup tasks — no new dependency, directory, or tooling. `vitest` + `@testing-library/react` already configured (`vitest.config.mts`, pattern in `tests/unit/components/badge.spec.tsx`).

---

## Phase 2: Foundational

No foundational tasks — nothing blocks the single user story.

---

## Phase 3: User Story 1 - Visitor sees the intro beside its image on desktop (Priority: P1) 🎯 MVP

**Goal**: `MediumImpact` hero renders rich text + links in a left column and the image in a right column on `md`+ screens; stacked (text then image) below `md`; no empty column when a side is missing.

**Independent Test**: Load a page with a Medium Impact hero that has text + image at ≥768px → text left, image right on one row; at 375px → text above image.

### Tests for User Story 1 (write first, observe red)

- [x] T001 [P] [US1] In `tests/unit/components/medium-impact-hero.spec.tsx`, add test "two-column grid when both text and media are present"; assert the outer container's class list contains `grid`, `md:grid-cols-2`, and a `gap-` utility. RichText/Media/CMSLink stubbed via `vi.mock` + dynamic import (they pull `@payloadcms/ui` SCSS + `next/image`), same pattern as `header-client.spec.ts`.
- [x] T002 [P] [US1] In the same file, add test "single column and no empty cell when one side is missing": (a) `links` only → container class list does NOT contain `md:grid-cols-2`, `[data-region="text"]` present, `[data-region="media"]` absent; (b) `media` only → no `md:grid-cols-2`, `[data-region="media"]` present, `[data-region="text"]` absent.
- [x] T003 [US1] Ran `pnpm exec vitest run tests/unit/components/medium-impact-hero.spec.tsx` → 2 failed: `expected [ '' ] to include 'grid'` (T001) and `expected null not to be null` for `[data-region="text"]` (T002). Red is the assertion itself, not the harness.

### Implementation for User Story 1

- [x] T004 [US1] Rewrite the JSX body of `src/heros/MediumImpact/index.tsx` per `contracts/hero-medium-layout.md` and `research.md`:
  - compute `hasText = Boolean(richText) || (Array.isArray(links) && links.length > 0)` and `hasMedia = media && typeof media === 'object'`;
  - single container `<div>` with `container my-8 grid gap-8`, plus `md:grid-cols-2 md:items-center` **only when** `hasText && hasMedia`;
  - render `<div data-region="text">` only when `hasText` — inside it keep `{richText && <RichText className="mb-6" data={richText} enableGutter={false} />}` and the existing `links` `<ul className="flex gap-4">`;
  - render `<div data-region="media">` only when `hasMedia` — inside it `<Media priority resource={media} />` (drop the `-mx-4 md:-mx-8 2xl:-mx-16` bleed classes and empty `imgClassName`) and keep the `{media?.caption && <RichText data={media.caption} enableGutter={false} />}` block in a `mt-3` wrapper;
  - delete the outer `<div className="">` wrapper and the duplicated `container` class now orphaned;
  - no `'use client'`, no new import, no colour class.
- [x] T005 [US1] `vitest run` the file → 2 passed. `pnpm typecheck` clean. `pnpm lint` → 0 errors, `theme-guard: 0 violations across 219 files` (12 pre-existing warnings in `src/migrations/*`, generated, not touched). Full `pnpm test:unit` → my 2 new tests pass; the 4 pre-existing failures (`tests/unit/repo/{design-staging,shape-scale,type-scale}`) are about `courses/` pages on this branch, unrelated.

**Checkpoint**: Medium Impact hero renders two columns on desktop, stacked on mobile, no empty column — verified by T001/T002 + lint + typecheck.

---

## Phase 4: User Story 2 - Editor changes nothing in their workflow (Priority: P2)

**Goal**: No admin field change, no migration; existing Medium Impact pages adopt the layout with no re-save.

**Independent Test**: Diff shows `src/heros/config.ts` and the Payload collections untouched; an already-published Medium Impact page renders the new layout.

### Implementation for User Story 2

- [x] T006 [US2] `git diff --stat` → only `src/heros/MediumImpact/index.tsx` (+37/-32); new untracked `tests/unit/components/medium-impact-hero.spec.tsx`. `config.ts`, `RenderHero.tsx`, `HighImpact/`, `LowImpact/`, `page.tsx`, `payload-types.ts` unchanged. `importMap.js` shows a line-ending-only (LF→CRLF) working-copy mark, no content change — not staged, not ours. No `pnpm generate:types`.
- [ ] T007 [US2] **Needs the user** — `quickstart.md` "Manual visual check": set the `home` page hero to Medium Impact with text + image, Publish, check 375 / 768 / 1280 / 1920 px + the two edge cases; confirm High/Low Impact heroes unchanged. Automated parts (tests, lint, typecheck, diff scope) done.

**Checkpoint**: Both stories satisfied; no schema or config drift.

---

## Phase 5: Polish & Cross-Cutting

- [x] T008 Re-read `INVARIANTS.md`. The "deliberately dark region" entry lists `heros/HighImpact` and `heros/PostHero` only — `MediumImpact` is normal-flow, token-classed, and this change adds no colour class and no `data-theme`. The 2-column layout is feature-local presentation, not forward-facing. **Nothing to change.**
- [ ] T009 **Deferred to the user** — commit on `feat/class-admin`. Session guidance: commit only when asked.

---

## Dependencies & Execution Order

- T001, T002 are [P] (same new file, but independent test blocks — write together, one file).
- T003 gate (observe red) → then T004 (implementation) → T005 (green + lint + typecheck).
- Phase 4 after Phase 3. Phase 5 last.
- US2 has no code; it is verification only and depends on US1 being implemented.

## Parallel Opportunities

Minimal — one component, one test file. T001 + T002 can be authored in one pass. Everything else is sequential.

## Implementation Strategy

MVP = User Story 1 (Phases 3). Ship after T005 green. User Story 2 is a no-code verification pass that should already hold by construction.

## Notes

- Every changed line must trace to FR-001…FR-008 / the two settled tests. No drive-by edits to the file's unrelated formatting.
- Test seen red before T004 — non-negotiable.
