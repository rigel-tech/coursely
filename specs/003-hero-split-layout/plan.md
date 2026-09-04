# Implementation Plan: Medium hero two-column layout

**Branch**: `feat/class-admin` (spec dir `specs/003-hero-split-layout`) | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-hero-split-layout/spec.md`

## Summary

Turn the `MediumImpact` hero from a vertical stack (rich text + links, then image below) into a two-column band on `md`+ screens: rich text + links on the left, image on the right. Below `md` it keeps the current single-column order (text, then image). Only the one presentational component changes; the hero field config, the admin editor, `RenderHero`, and every other hero type are untouched. All styling via existing Tailwind utilities / design tokens.

## Technical Context

**Language/Version**: TypeScript 5, React 19 (Next.js 16 App Router)

**Primary Dependencies**: `@payloadcms/richtext-lexical` (already used by the hero via `RichText`), Tailwind v4, shadcn/ui — no new deps

**Storage**: N/A — no schema or data change

**Testing**: `vitest` + `@testing-library/react` (`tests/unit/`, jsdom), pattern established by `tests/unit/components/badge.spec.tsx`

**Target Platform**: Public web (frontend route group), server-rendered component

**Project Type**: Web application (Payload CMS + Next.js)

**Performance Goals**: No change — same markup weight; no client JS added (`MediumImpactHero` stays a Server Component)

**Constraints**: UI colour/spacing from tokens only (theme-guard in `pnpm lint`); no raw hex / colour functions / Tailwind palette classes; no `dark:` colour variants; change only what the task requires

**Scale/Scope**: One file changed (`src/heros/MediumImpact/index.tsx`), one new unit-test file

## Constitution Check

_GATE: must pass before Phase 0 and again after Phase 1._

| Principle / decision                   | Status      | Note                                                                                                                                                                                  |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Think before writing code           | PASS        | Assumptions recorded in spec (breakpoint = `md`, ratio ~50/50, applies to every Medium Impact hero). No ambiguous readings left.                                                      |
| II. Simple first                       | PASS        | Smallest change: wrap the existing two `<div>`s in a `md:grid md:grid-cols-2` container. No new hero type, no config field, no prop.                                                  |
| III. Change only what was asked        | PASS        | Only `MediumImpact/index.tsx`. `HighImpact`, `LowImpact`, `RenderHero`, `heros/config.ts`, `page.tsx` untouched. No drive-by cleanup of the file's pre-existing empty `className=""`. |
| IV. Verifiable goals                   | PASS        | Verified by a unit test asserting the container's responsive grid classes + DOM order (text region before image region), plus `quickstart.md` visual checks. See Testing below.       |
| UI colour from tokens                  | PASS        | New classes are layout-only (`grid`, `grid-cols`, `gap-*`, `items-center`, `md:*`). No colour touched. theme-guard still runs in `pnpm lint`.                                         |
| Tokens govern public UI only           | PASS        | Hero is public UI; staying within tokens.                                                                                                                                             |
| Every test written first, observed red | PLANNED     | Test file added and run red before the component change (see tasks phase).                                                                                                            |
| Invariants maintained                  | PASS        | No listed invariant covers hero layout. `data-theme="dark"` invariant applies only to `HighImpact`, not touched. Nothing to add or supersede.                                         |
| Spec Kit workflow                      | IN PROGRESS | specify → plan (here) → tasks → test-list prompt → implement.                                                                                                                         |

No violations. Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/003-hero-split-layout/
├── spec.md
├── plan.md                # this file
├── research.md            # Phase 0
├── quickstart.md          # Phase 1
├── contracts/
│   └── hero-medium-layout.md   # Phase 1 — rendering contract
├── checklists/
│   └── requirements.md
└── tasks.md               # created by /speckit-tasks
```

data-model.md is intentionally absent — no entities, no persisted state.

### Source Code (repository root)

```text
src/heros/MediumImpact/index.tsx      # CHANGED — wrap content + media in a responsive grid
tests/unit/components/medium-impact-hero.spec.tsx   # NEW — responsive layout + DOM order
```

**Structure Decision**: Single-file component edit inside the existing `src/heros/` tree; test alongside the other component tests in `tests/unit/components/`.

## Approach

Current component body (abridged):

```tsx
<div className="">
  <div className="container mb-8">
    {' '}
    {richText} {links}{' '}
  </div>
  <div className="container">
    {' '}
    {media} {caption}{' '}
  </div>
</div>
```

Target: one `container` that becomes a grid on `md`+, with the text block and the media block as its two cells. Sketch:

```tsx
<div className="container my-8 grid gap-8 md:grid-cols-2 md:items-center">
  <div> {richText && <RichText .../>} {links && <ul .../>} </div>
  {media && typeof media === 'object' && (
    <div> <Media .../> {caption && <RichText .../>} </div>
  )}
</div>
```

- **Mobile (< md)**: single column, source order = text first, then media — matches FR-002. No `grid-cols` below `md`.
- **Desktop (≥ md)**: `md:grid-cols-2` → text left, media right; `md:items-center` keeps them reading as a pair (FR-005).
- **No image (FR-004)**: the media `<div>` is not rendered at all (guard already exists), so on `md`+ the single remaining cell occupies its column; acceptable — text simply doesn't stretch full-bleed. If the spec's "text column fills the available width" must be exact, add `md:[&>*:only-child]:col-span-2` — decided in research.md.
- **No text and no links**: the text `<div>` still renders but empty. research.md decides whether to guard it like the media cell for symmetry with FR-004.
- Remove the now-unused outer wrapper and the duplicated `container` class; keep `Media`'s existing negative-margin bleed classes only if they still read well inside a grid cell — research.md item.
- `caption` handling (`media.caption`) carried over unchanged (FR-008).

No `'use client'`, no new import. `RichText`, `Media`, `CMSLink` imports stay.

## Testing

**Required (derived from the changed code):**

- `tests/unit/components/medium-impact-hero.spec.tsx`:
  - renders the outer container with `grid`, `md:grid-cols-2` (responsive two-column on `md`+), and a gap utility;
  - the text region (containing the links list) appears **before** the media region in DOM order (mobile stack order = text then image);
  - with `media` omitted, no media cell is rendered and the component still renders without throwing.

**Suggested:**

- with `links` provided, each renders through `CMSLink` inside the left cell;
- a static assertion that the file adds no raw colour literal (redundant with theme-guard but local to the change);
- `quickstart.md` manual viewport checks at 375px / 768px / 1280px / 1920px for no horizontal scroll (SC-004) and correct side-by-side vs stacked (SC-001/SC-002).

The required list will go through the `AskUserQuestion` multi-select in `/speckit-tasks` before any code is written; each test is committed red first.

## Complexity Tracking

No constitution violations — table omitted.
