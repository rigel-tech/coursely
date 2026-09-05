# Quickstart: Validating the Course URL Rename

Prerequisites: `pnpm dev` running.

## Scenario 1 — every in-site path stays on /khoa-hoc

1. Load `/`. Click "Khóa học" in the nav. **Expect**: address bar shows `/khoa-hoc`.
2. On the list, apply a category/type filter or search. **Expect**: address stays
   under `/khoa-hoc?...`, never `/courses?...`.
3. Click "Xóa bộ lọc" (clear filters). **Expect**: returns to `/khoa-hoc` (no query).
4. Click into any course card. **Expect**: address is `/khoa-hoc/{slug}`.
5. On the detail page, click the "Khóa học" breadcrumb link. **Expect**: returns to
   `/khoa-hoc`.
6. From the homepage, click a course teaser card. **Expect**: `/khoa-hoc/{slug}`.
7. Sign in, go to the account page, click "Đăng ký khóa mới" and "Khám phá khóa học".
   **Expect**: both land on `/khoa-hoc`.

## Scenario 2 — the old address still works

1. Navigate directly to `/courses` (typed in the address bar). **Expect**: the same
   course list renders (still served by the untouched route folder).
2. Navigate to `/courses/{a-real-slug}`. **Expect**: the same course detail renders.

## Scenario 3 — the personal course area is untouched

1. Confirm `/khoa-hoc-cua-toi` (or wherever that link appears in the signed-in nav)
   still resolves exactly as before — this feature must not have touched it.

## Automated coverage

`pnpm test:unit` runs the new `tests/unit/repo/*` scan asserting no route-facing
`/courses` literal remains outside the one documented exception — see tasks.md for
the exact file.
