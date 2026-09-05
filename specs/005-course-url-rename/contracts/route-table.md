# Contract: Public Course Route Table

| Public URL (advertised) | Serves                      | Mechanism                                             |
| ----------------------- | --------------------------- | ----------------------------------------------------- |
| `/khoa-hoc`             | Course list                 | New `rewrites.ts` entry → `/courses`                  |
| `/khoa-hoc/{slug}`      | Course detail               | New `rewrites.ts` entry → `/courses/{slug}`           |
| `/courses`              | Course list (compat only)   | Existing folder, no longer linked to internally       |
| `/courses/{slug}`       | Course detail (compat only) | Existing folder, no longer linked to internally       |
| `/khoa-hoc-cua-toi`     | Personal "my courses" area  | **Unchanged** — distinct route, out of scope (FR-005) |

## Rule

Every `Link href`, `router.push`, and generated URL string in route-facing code
(everything in plan.md's Project Structure list except the excluded `PayloadRedirects`
lookup key, see research.md) uses the left column. Nothing in the codebase should
construct the middle two rows except the rewrite entries themselves and the one
excluded `url` variable in `courses/[slug]/page.tsx`.
