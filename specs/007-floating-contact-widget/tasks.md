---
description: 'Task list for Floating Contact Widget'
---

# Tasks: Floating Contact Widget

**Input**: Design documents from `/specs/007-floating-contact-widget/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/, quickstart.md

**Tests**: Mandatory per `CLAUDE.md` Settled Decisions — required/suggested list put
to the user via `AskUserQuestion` before any test or code is written (T000).

**Organization**: One user story (US1) — the widget is a single, indivisible slice;
there is no second story to sequence after it.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — `src/components/public/`, `src/app/(frontend)/layout.tsx`,
`tests/unit/components/`.

---

## Phase 0: Test-List Gate

- [x] T000 Present the required/suggested test list via `AskUserQuestion`
      (multi-select) per `CLAUDE.md` Settled Decisions. Required = T001 (the only
      test this feature needs — a render/contract check with no branching logic to
      cover); no suggested items (a two-static-link component has no edge case left
      for a suggested test to add).

---

## Phase 1: User Story 1 - Reaching the center from anywhere (Priority: P1) 🎯 MVP

**Goal**: Both contact buttons are visible, fixed to the bottom-right corner, on
every public page, correctly linking to Zalo and the phone dialer, and are absent
from `/admin`.

**Independent Test**: `quickstart.md` Scenarios 1-3.

### Tests for User Story 1 ⚠️

> Write first; run and observe it fail before creating the component.

- [x] T001 [Required] Write failing test in new file
      `tests/unit/components/floating-contact.spec.ts`: render `FloatingContact`
      (module doesn't exist yet — confirm the failure is the missing import, not a
      typo) and assert: the Zalo link's accessible name includes "Chat Zalo" and
      "0987 654 321", its `href` is exactly `https://zalo.me/0987654321`, and it has
      `target="_blank"` + `rel="noopener noreferrer"`; the hotline link's accessible
      name includes "Gọi hotline" and "1900 6789", and its `href` is exactly
      `tel:19006789`.

### Implementation for User Story 1

- [x] T002 [US1] Create `src/components/public/FloatingContact/index.tsx` per
      `contracts/component.md`: a `<div className="fixed bottom-4 right-4 z-50 flex
    flex-col items-end gap-3">` containing two `Button asChild` links — Zalo
      (`variant="default"`, `MessageCircle` icon from `lucide-react`, label "Chat
      Zalo" + "0987 654 321", `href="https://zalo.me/0987654321"`, `target="_blank"`,
      `rel="noopener noreferrer"`) and hotline (`variant="brand"`, `Phone` icon,
      label "Gọi hotline" + "1900 6789", `href="tel:19006789"`), both with
      `className="rounded-full"` to override the default `rounded-md`. Own both
      phone number strings as named constants at the top of the file (see
      contracts/component.md). No `'use client'` needed. Run T001 and confirm it
      passes.
- [x] T003 [US1] Edit `src/app/(frontend)/layout.tsx`: import `FloatingContact` from
      `@/components/public/FloatingContact` and render `<FloatingContact />` inside
      `<Providers>`, as a sibling to `<Header />` and `<Footer />` (placement doesn't
      matter relative to `{children}` since it's `fixed`-positioned, but keep it
      adjacent to `<Footer />` for readability). Do **not** touch any file under
      `src/app/(payload)/`.

**Checkpoint**: `quickstart.md` Scenarios 1-3 all pass manually; T001 green.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [x] T004 [P] Run `pnpm lint` and `pnpm typecheck` — both green. **Both green**
      (lint: same 12 pre-existing unrelated warnings in `src/migrations/*`,
      theme-guard: 0 violations; typecheck: clean).
- [x] T005 Run `pnpm test:unit` — all green, including T001. **All tests for this
      feature pass.** One pre-existing, unrelated failure remains
      (`tests/unit/lib/route-guard.spec.ts`'s `/admin` gate — predates this feature).
- [ ] T006 Walk through `quickstart.md` Scenarios 1, 2, and 3 manually against
      `pnpm dev`. Not run this pass — left for the user to confirm before shipping,
      and to swap in the real Zalo number in place of the placeholder.

---

## Dependencies & Execution Order

- **Phase 0 (Gate)**: Must complete before any test or implementation task.
- **Phase 1**: T001 (test) before T002 (implementation); T003 depends on T002 (the
  component must exist before the layout can import it).
- **Phase 2**: Depends on Phase 1 being complete.

## Notes

- No `[Suggested]` test this round: `FloatingContact` has no conditional rendering,
  no state, and no user-input-dependent branch — the one contract test (T001) already
  covers everything observable about it. The `/admin`-absence requirement (FR-005) is
  satisfied structurally by where the component is wired in (T003), not by a runtime
  check, so there is nothing further a unit test could exercise beyond what T001
  already asserts about the component's own output.
