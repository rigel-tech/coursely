# Feature Specification: Course URL Rename to /khoa-hoc

**Feature Branch**: `005-course-url-rename`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Đổi đường dẫn công khai của trang danh sách/chi tiết khóa học từ /courses sang /khoa-hoc, theo đúng pattern đã có trong rewrites.ts (rewrite Vietnamese public URL sang folder tiếng Anh, ví dụ /xac-thuc-otp -> /user/verify-otp): (1) Thêm rewrite '/khoa-hoc' -> '/courses' và '/khoa-hoc/:slug' -> '/courses/:slug' trong rewrites.ts (giữ nguyên folder src/app/(frontend)/courses/ không đổi tên, chỉ đổi URL công khai). (2) Cập nhật mọi Link href, router.push và chuỗi literal '/courses' trong code để trỏ sang '/khoa-hoc' thay vì '/courses'. (3) route-guard.ts đã có PROTECTED_PREFIXES chứa '/khoa-hoc-cua-toi' (trang 'khóa học của tôi' — khác, không đụng vào) — không nhầm với '/khoa-hoc' (trang danh sách khóa học công khai) trong thay đổi này."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visiting the course pages at their new address (Priority: P1)

A visitor clicks "Khóa học" in the site navigation, browses the course list, filters
it, opens one course's detail page, and navigates back to the list — all without
ever seeing or needing to know the old `/courses` address. Every link the site
itself renders (nav, homepage course teasers, filter controls, "back to list" links,
account-page course links) already points at the new address.

**Why this priority**: This is the entire ask — a visible, public URL change. If the
site's own links still point at the old path, the rename hasn't actually happened
from a visitor's point of view, regardless of what the routing layer accepts.

**Independent Test**: Load the homepage, click through the nav's "Khóa học" link,
apply a filter, open a course, use every "back"/"clear filters" link on those pages,
and confirm the address bar shows `/khoa-hoc` (and `/khoa-hoc/{slug}` for a detail
page) at every step, never `/courses`.

**Acceptance Scenarios**:

1. **Given** a visitor on any page, **When** they click the "Khóa học" nav item,
   **Then** they land on the course list at `/khoa-hoc`.
2. **Given** a visitor on the course list with a filter applied, **When** they
   share or reload that URL, **Then** the address and its filter query string use
   `/khoa-hoc`, and the same filtered list loads.
3. **Given** a visitor on the course list, **When** they open a course, **Then**
   the detail page's address is `/khoa-hoc/{slug}`, and its own "back to list" link
   returns them to `/khoa-hoc`.
4. **Given** a signed-in student on their account page, **When** they follow a
   "browse/enroll in a course" link there, **Then** it lands them on `/khoa-hoc`
   (list) or `/khoa-hoc/{slug}` (detail), not `/courses`.

### Edge Cases

- What happens to a bookmark or an external link still pointing at the old
  `/courses` address? It must keep working (transparently serving the same page),
  since the underlying page implementation is not moving — only the address the
  site itself advertises changes.
- What happens to the personal, sign-in-gated "khóa học của tôi" ("my courses")
  area? Untouched — it is a distinct destination from the public course list and
  is out of scope for this rename.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The public course list MUST be reachable at `/khoa-hoc`.
- **FR-002**: A public course detail page MUST be reachable at
  `/khoa-hoc/{course-slug}`.
- **FR-003**: The old `/courses` and `/courses/{course-slug}` addresses MUST
  continue to resolve to the same content (no broken bookmarks/external links).
- **FR-004**: Every link, redirect, or generated URL the site itself produces
  toward the course list or a course detail page MUST use the `/khoa-hoc` address,
  never `/courses` — this includes (but is not limited to) the main site
  navigation, the homepage's course teasers, the course list's own filter and
  "clear filters" controls, a course detail page's "back to list" link, and the
  account page's course-related links.
- **FR-005**: The distinct, sign-in-gated "khóa học của tôi" personal course area
  MUST NOT be affected by this change — its own address stays exactly as it is
  today.

### Key Entities

- **Public course URL**: The address a visitor uses to reach the course list or a
  specific course's detail page; changing from `/courses`-based to
  `/khoa-hoc`-based while the underlying page continues to exist unmoved.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of links the site itself renders toward the course list or a
  course detail page use `/khoa-hoc`, verified by a full pass over the codebase for
  the literal string `/courses` in route-facing code.
- **SC-002**: A visitor following any in-site path to the course pages never sees
  `/courses` in the address bar.
- **SC-003**: An existing bookmark or external link to the old `/courses` address
  still successfully loads the intended page.

## Assumptions

- The underlying route implementation (files under
  `src/app/(frontend)/courses/`) stays where it is; only the public-facing address
  changes, using the same rewrite mechanism already established in `rewrites.ts` for
  the auth pages (Vietnamese public path → English folder name).
- "Every link the site itself renders" is read literally from the feature request's
  own file list plus anything else in the codebase matching the same pattern — not
  expanded to unrelated areas (e.g., Payload admin previews of course blocks, which
  render inside the CMS editor, not as a public navigable link).
- No CMS-authored navigation currently overrides the course nav item (the default,
  hard-coded nav item is what exists today); if a CMS-driven nav entry for courses is
  ever added later, keeping it in sync with `/khoa-hoc` is the CMS author's
  responsibility, not something this rename can enforce in code.
