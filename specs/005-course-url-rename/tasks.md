---
description: 'Task list for Course URL Rename to /khoa-hoc'
---

# Tasks: Course URL Rename to /khoa-hoc

**Input**: Design documents from `/specs/005-course-url-rename/`

**Prerequisites**: plan.md, spec.md, research.md, contracts/, quickstart.md

**Tests**: Mandatory per `CLAUDE.md` Settled Decisions — the required/suggested list
is put to the user via `AskUserQuestion` before any test or code is written (T000).

**Organization**: One user story (US1) — the rename is a single, indivisible slice;
FR-003/FR-005 (old path still works, personal area untouched) are guardrails on that
same story, not separate stories with their own MVP value.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Single Next.js project — `src/`, `tests/`, and root-level `rewrites.ts` (see
plan.md → Project Structure).

---

## Phase 0: Test-List Gate

- [x] T000 Present the required/suggested test list via `AskUserQuestion`
      (multi-select) per `CLAUDE.md` Settled Decisions; do not write any test or
      implementation code until this returns. Required = T001; there is no
      suggested item this round (see Notes below).

---

## Phase 1: User Story 1 - Course pages answer at /khoa-hoc (Priority: P1) 🎯 MVP

**Goal**: `/khoa-hoc` and `/khoa-hoc/{slug}` serve the course pages; every link the
site renders toward them uses that address; `/courses` keeps working for old
bookmarks; `/khoa-hoc-cua-toi` is untouched.

**Independent Test**: `quickstart.md` Scenarios 1-3 in full.

### Tests for User Story 1 ⚠️

> Write first; run and observe it fail before touching any of the implementation
> files below.

- [x] T001 [Required] Write failing test in new file
      `tests/unit/repo/course-url-rename.spec.ts` (follow the walk/scan style of
      `tests/unit/repo/import-boundaries.spec.ts`): scan the six files listed in
      research.md's inventory table for the literal substring `/courses` and assert
      none remains — **except** the one documented exception, the
      `const url = '/courses/' + decodedSlug` line in
      `src/app/(frontend)/courses/[slug]/page.tsx` (match that one line specifically
      and exclude only it, so the test still catches every _other_ occurrence in that
      same file). Also assert the scan actually visited all six files (an empty/wrong
      file list would pass vacuously — same guard `import-boundaries.spec.ts` uses).
      Confirm it fails now (all six files still contain the literal).

### Implementation for User Story 1

- [x] T002 [P] [US1] Add to `rewrites.ts`'s returned array:
      `{ source: '/khoa-hoc', destination: '/courses' }` and
      `{ source: '/khoa-hoc/:slug', destination: '/courses/:slug' }`, placed with the
      existing auth-page entries per the file's own convention (see
      contracts/route-table.md).
- [x] T003 [P] [US1] `src/Header/Nav/index.tsx`: change `DEFAULT_NAV`'s "Khóa học"
      entry `url` from `/courses` to `/khoa-hoc`.
- [x] T004 [P] [US1] `src/app/(frontend)/page.tsx`: change the homepage course-teaser
      card `href` template from `` `/courses/${course.slug}` `` to
      `` `/khoa-hoc/${course.slug}` ``.
- [x] T005 [US1] `src/app/(frontend)/courses/page.tsx`: change the course-card `href`
      template (`` `/courses/${course.slug}` `` → `` `/khoa-hoc/${course.slug}` ``) and
      the "Xóa bộ lọc" empty-state `<Link href="/courses">` → `href="/khoa-hoc"`.
      Do **not** touch this file's route folder location or its data fetching.
- [x] T006 [US1] `src/app/(frontend)/courses/[slug]/page.tsx`: change only the
      breadcrumb `<Link href="/courses">` → `href="/khoa-hoc"`. Leave the
      `const url = '/courses/' + decodedSlug` line and both `<PayloadRedirects
    url={url} />` usages exactly as they are (see research.md — that is a CMS
      redirects-collection lookup key, not a rendered link).
- [x] T007 [US1] `src/components/public/CourseFilters/index.tsx`: change every
      `/courses`-literal to `/khoa-hoc` — the `router.push` fallback in
      `applyFilters`, `buildFilterUrl`'s return value, and the "Xóa bộ lọc"
      `<Link href="/courses">`.
- [x] T008 [P] [US1] `src/app/(frontend)/user/account/ProfileForm.tsx`: change both
      `<Link href="/courses">` occurrences ("Đăng ký khóa mới", "Khám phá khóa học")
      to `href="/khoa-hoc"`.
- [x] T009 [US1] Run T001 and confirm it now passes. Depends on T002-T008.

**Checkpoint**: `quickstart.md` Scenarios 1-3 all pass manually; T001 green.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [x] T010 [P] Run `pnpm lint` and `pnpm typecheck` — both green. **Both green**
      (lint: same 12 pre-existing unrelated warnings in `src/migrations/*`;
      typecheck: clean).
- [x] T011 Run `pnpm test:unit` — all green, including T001. **All tests for this
      feature pass**, including the new `course-url-rename.spec.ts`. One
      pre-existing, unrelated failure remains (`tests/unit/lib/route-guard.spec.ts`
      — the `/admin` gate, confirmed via `git log` to predate this feature).
- [ ] T012 Walk through `quickstart.md` Scenarios 1, 2, and 3 manually against
      `pnpm dev`. Not run this pass — left for the user to confirm against a
      running dev server before shipping.

---

## Dependencies & Execution Order

- **Phase 0 (Gate)**: Must complete before any test or implementation task.
- **Phase 1**: T002-T008 are all independent file edits (no shared file conflicts
  except none — every task names a distinct file) and can run in any order or in
  parallel; T009 (verification) depends on all of them.
- **Phase 2**: Depends on Phase 1 being complete.

## Notes

- No `[Suggested]` test this round: the feature's own success criterion (SC-001) is
  "100% of literals updated," which T001 checks exhaustively by construction — there
  is no partial/optional coverage left to offer beyond it. SC-002/SC-003 (never seeing
  `/courses` while browsing; old links still resolve) are covered by the manual
  quickstart walkthrough (T012), which a static source scan cannot verify (it would
  require a browser/server, out of `tests/unit`'s no-infra contract).
- The `Pagination` component's hardcoded `/posts/page/{n}` bug (found in research.md)
  is explicitly not a task here — reported to the user as out-of-scope, unrelated to
  the `/courses` → `/khoa-hoc` rename.
