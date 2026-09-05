# Implementation Plan: Course URL Rename to /khoa-hoc

**Branch**: `005-course-url-rename` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-course-url-rename/spec.md`

## Summary

The public course pages currently live at `/courses` and `/courses/{slug}`, unlike
every other public-facing user flow in this app (login/register/OTP/forgot-password),
which already goes through a Vietnamese public path rewritten onto an English folder
(`rewrites.ts`). Approach: add the same rewrite for courses without moving the route
folder, then replace every internal `/courses`-literal (nav, homepage teasers, filter
controls, detail-page breadcrumb/back-link, account-page links) with `/khoa-hoc`, so
the site never advertises the old path even though it keeps working for existing
bookmarks/links.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (`rewrites()` in
`next.config.ts` via `rewrites.ts`)

**Primary Dependencies**: None new — reuses Next's built-in `rewrites` config already
wired for the auth pages

**Storage**: N/A — no data changes

**Testing**: Vitest `tests/unit` (route-literal grep-style assertions, matching the
existing `tests/unit/repo/*` convention of scanning source for a pattern)

**Target Platform**: Web (Next.js)

**Project Type**: Single Next.js web app

**Performance Goals**: N/A

**Constraints**: The old `/courses` address must keep resolving (FR-003) — this is an
additive rewrite, not a move; the sign-in-gated `/khoa-hoc-cua-toi` prefix must not be
touched (FR-005)

**Scale/Scope**: 1 rewrite entry + ~9 literal-string call sites across 6 files (per the
codebase scan in research.md)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **II. Simple first** — reuses the exact rewrite mechanism already in `rewrites.ts`;
  no new abstraction, no config surface, no route folder move. **Pass.**
- **III. Change only what was asked** — touches only files that build a `/courses`
  literal (per research.md's scan). Does not touch the unrelated, pre-existing
  `Pagination` component bug found during research (hardcodes `/posts/page/{n}` even
  when reused on the courses page) — reported as an out-of-scope observation instead.
  Does not touch `/khoa-hoc-cua-toi` (a different, already-Vietnamese, sign-in-gated
  route). **Pass.**
- **IV. Drive to verifiable goals** — every FR maps to an acceptance scenario; a
  codebase-wide literal scan is the verification method for FR-004/SC-001.
  **Pass.**
- No Payload collection/field, theme-token, or INVARIANTS.md changes anticipated.
  **N/A.**

No violations. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-course-url-rename/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── contracts/           # Phase 1 output (route table — no data-model.md; no entities)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
rewrites.ts                                          # EDIT — add /khoa-hoc entries

src/Header/Nav/index.tsx                              # EDIT — DEFAULT_NAV url
src/app/(frontend)/page.tsx                           # EDIT — homepage course teaser hrefs
src/app/(frontend)/courses/page.tsx                   # EDIT — card hrefs, "clear filters" link
src/app/(frontend)/courses/[slug]/page.tsx            # EDIT — breadcrumb link (not the
                                                       #   `url` used for PayloadRedirects —
                                                       #   see research.md)
src/components/public/CourseFilters/index.tsx         # EDIT — router.push/buildFilterUrl/
                                                       #   "clear filters" link
src/app/(frontend)/user/account/ProfileForm.tsx       # EDIT — 2 course links

tests/unit/repo/                                      # NEW spec asserting no route-facing
                                                       #   `/courses` literal remains
```

**Structure Decision**: Single Next.js app — no new directories. Every touched file
already exists; this is a literal-string + one rewrite-config change, matching
`plan.md`'s Scope line.

## Complexity Tracking

_No Constitution Check violations — table not applicable._
