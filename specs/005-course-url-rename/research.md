# Phase 0 Research: Course URL Rename to /khoa-hoc

No `[NEEDS CLARIFICATION]` markers in `spec.md` — the request named the exact
mechanism to reuse. This phase is the codebase scan that pins down every call site,
plus the two things found during that scan that are deliberately _not_ touched.

## Decision: reuse `rewrites.ts`'s existing pattern verbatim

**Decision**: Add to `rewrites.ts`'s array:
`{ source: '/khoa-hoc', destination: '/courses' }` and
`{ source: '/khoa-hoc/:slug', destination: '/courses/:slug' }`.

**Rationale**: `rewrites.ts` already documents this exact shape for the auth pages
(`/xac-thuc-otp` → `/user/verify-otp`, etc.) and its header comment states the rule
this feature must also follow: "Proxy... and every `redirect()` / `Link href` in the
app... must keep using the public path on the left, never the folder name on the
right." Courses just hadn't been migrated onto that pattern yet.

**Alternatives considered**:

- _Rename the route folder itself_ (`src/app/(frontend)/courses/` →
  `.../khoa-hoc/`) — rejected: spec.md's own Assumptions section and the user's
  request both say the folder stays; a rewrite is strictly additive and keeps
  `/courses` working (FR-003), a folder rename would not.

## Decision: full literal-string call-site inventory (six files, one component)

A full-repo scan for the literal `/courses` in `.ts`/`.tsx` files under `src/`
(excluding Payload admin block-preview components, which render inside the CMS editor
and are never a public link) turns up:

| File                                              | What it builds                                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/Header/Nav/index.tsx`                        | `DEFAULT_NAV` fallback nav item's `url`                                                                           |
| `src/app/(frontend)/page.tsx`                     | Homepage course-teaser card `href`                                                                                |
| `src/app/(frontend)/courses/page.tsx`             | Course-card `href`, "Xóa bộ lọc" (clear filters) empty-state link                                                 |
| `src/app/(frontend)/courses/[slug]/page.tsx`      | Breadcrumb `Link href="/courses"` (a second, unrelated `url` variable on this file is addressed separately below) |
| `src/components/public/CourseFilters/index.tsx`   | `router.push` target in `applyFilters`, `buildFilterUrl`'s return value, the "Xóa bộ lọc" link                    |
| `src/app/(frontend)/user/account/ProfileForm.tsx` | Two links ("Đăng ký khóa mới", "Khám phá khóa học")                                                               |

**Rationale for the exclusion**: `src/components/design/blocks/course-card.tsx` and
`course-list.tsx` (and `course-form.tsx`) live under `components/design/blocks` —
Payload admin block-preview components, rendered inside the CMS editor UI, never
reachable as a public browser navigation. Renaming a public URL doesn't apply to them;
they are out of the spec's own scope ("Payload admin previews of course blocks... not
expanded").

## Decision: leave `courses/[slug]/page.tsx`'s `url` variable alone

That file has a second `/courses/`-literal:
`const url = '/courses/' + decodedSlug`, passed to `<PayloadRedirects url={url} />`
(twice) and used for the not-found fallback. This is _not_ a link a visitor clicks —
it is the lookup key `PayloadRedirects` uses against Payload's own `redirects`
collection (a CMS-managed 404/redirect table, unrelated to the Next.js `rewrites`
config). Changing it would silently break any CMS-authored redirect record keyed on
the old path, and spec.md's FR-004 only requires _links the site renders_, not this
internal lookup key. Left untouched; flagged here for visibility since it looks
identical to the links being changed everywhere else in the same file.

## Decision: report, don't fix, the `Pagination` component's hardcoded `/posts/page/`

`src/app/(frontend)/courses/page.tsx` renders `<Pagination page=... totalPages=... />`
from `src/components/public/Pagination/index.tsx`, whose every `router.push` targets
`/posts/page/${n}` — hardcoded for the blog, not parameterized. The courses page
itself paginates via a `?page=` query string (its own `searchParams.page`), so this
shared component's page-N/next/prev controls already send a courses-page visitor to
the wrong section entirely, independent of `/courses` vs `/khoa-hoc`.

**Rationale for not fixing it here**: Out of this feature's scope per Principle III —
it is not a `/courses`-literal (renaming that string doesn't fix or worsen the bug) and
fixing a shared component's parameterization is a different, unrelated change.
Reported for the user's awareness; no code changed.

## Decision: verification method — a source-scanning unit test

**Decision**: Add one `tests/unit/repo/*.spec.ts` test that greps route-facing source
(the six files above) for the literal `/courses` and fails if found outside the one
deliberately-excluded `url` variable.

**Rationale**: `tests/unit/repo/` already hosts exactly this style of check
(`import-boundaries.spec.ts`, `component-roles.spec.ts` — static assertions over the
repo's own source, no runtime/browser needed) matching SC-001's own wording ("verified
by a full pass over the codebase for the literal string `/courses`").

**Alternatives considered**:

- _E2E test clicking through the UI_ — would additionally validate rendered behavior,
  but this repo's `tests/e2e/` needs a browser and `pnpm dev`; a static scan is the
  faster, infra-free check for "did every call site get updated," which is exactly
  what a rename risks getting only partly done. Manual click-through is still covered
  in `quickstart.md`.
