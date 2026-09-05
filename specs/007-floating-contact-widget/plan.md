# Implementation Plan: Floating Contact Widget

**Branch**: `007-floating-contact-widget` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-floating-contact-widget/spec.md`

## Summary

A new presentational component, `FloatingContact`, fixed to the viewport's
bottom-right corner, rendered once in the `(frontend)` root layout (alongside
`Header`/`Footer`, so it never reaches `/admin`). Two stacked pill links reuse the
existing `Button` component's `default` (blue, `--primary`) and `brand` (orange,
`--brand-accent`) variants verbatim — no new color tokens — rounded to a full pill via
an existing `className` override. No CMS field, no toggle, no server data: both phone
numbers are literal constants in the component, matching how the header's hotline
number already works today.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router, React 19

**Primary Dependencies**: Existing `Button` component (`@/components/public/ui/button`,
already has the two needed color variants), `lucide-react` (already a dependency, for
the phone icon; the chat icon uses its `MessageCircle` glyph — no Zalo trademark
asset is used, per spec.md's assumption that this is a generic "chat" affordance)

**Storage**: N/A — no data, no CMS field

**Testing**: Vitest `tests/unit/components` — a plain render test, matching the style
of `tests/unit/components/button.spec.ts`

**Target Platform**: Web (Next.js), all public pages

**Project Type**: Single Next.js web app

**Performance Goals**: N/A — two static links, no client state beyond none

**Constraints**: Must not render under `/admin` (FR-005) — satisfied structurally by
placement in the `(frontend)` root layout, which `/admin` (a separate Payload route
group) never renders through

**Scale/Scope**: 1 new component file, 1 root-layout edit, 1 new test file

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **II. Simple first** — reuses existing `Button` variants and an existing icon
  library; no new color tokens, no CMS field, no configuration surface beyond what
  the header's hotline already lacks. **Pass.**
- **III. Change only what was asked** — one new component, one layout insertion
  point; does not touch `Header`, `Footer`, or any admin surface. **Pass.**
- **IV. Drive to verifiable goals** — FR-001 through FR-005 each map to an acceptance
  scenario in spec.md; the placeholder Zalo number is called out explicitly rather
  than silently shipped as if real. **Pass.**
- **UI colour comes from tokens** — both buttons use existing token-backed variants
  (`default`/`brand`); no hex, no raw color function is introduced. **Pass.**
- **Tokens govern public UI only** — this component is public-site-only by
  construction (root layout for `(frontend)`, not `(payload)`). **N/A concern,
  satisfied structurally.**

No violations. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-floating-contact-widget/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── contracts/           # Phase 1 output (component contract — no data-model.md, no data)
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/components/public/FloatingContact/
└── index.tsx                                # NEW — the widget component

src/app/(frontend)/layout.tsx                 # EDIT — render <FloatingContact /> alongside Header/Footer

tests/unit/components/floating-contact.spec.ts # NEW — renders, checks both links' hrefs/labels
```

**Structure Decision**: Single Next.js app. New component lives under
`src/components/public/` (public UI, not tied to one route) beside `HeaderAuthControls`
and other shared public widgets; no new top-level directories.

## Complexity Tracking

_No Constitution Check violations — table not applicable._
