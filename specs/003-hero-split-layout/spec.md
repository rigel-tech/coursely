# Feature Specification: Medium hero two-column layout

**Feature Branch**: `003-hero-split-layout`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Hero kiểu 'Medium Impact' chuyển từ bố cục xếp dọc (chữ trên, ảnh dưới) sang bố cục 2 cột trên màn hình md trở lên: rich text + các nút link ở cột trái, ảnh (media) ở cột phải. Trên mobile vẫn xếp dọc chữ trước, ảnh sau. Không thêm/đổi field trong admin — vẫn là Type 'Medium Impact', nhập rich text, upload ảnh như cũ; chỉ khác cách hiển thị. Dùng cho phần 'Giới thiệu trung tâm' ở trang chủ. Chỉ dùng Tailwind + design token, không hex/màu thô."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visitor sees the intro beside its image on desktop (Priority: P1)

A visitor opens the home page on a laptop. The centre-introduction text (heading, paragraph, call-to-action buttons) sits in the left half of the hero and the accompanying image sits in the right half, the two aligned side by side, so the visitor reads the message and sees the visual at a glance without scrolling past a tall stacked block.

**Why this priority**: This is the whole point of the change — the side-by-side arrangement on wide screens. Without it there is no feature.

**Independent Test**: Load a home page whose hero is set to "Medium Impact" with both text and an image on a viewport ≥ the medium breakpoint; confirm text occupies the left column and the image the right column, on the same row.

**Acceptance Scenarios**:

1. **Given** a page with a Medium Impact hero that has rich text, one or more links, and an uploaded image, **When** it is viewed at a width at or above the medium breakpoint, **Then** the rich text and links appear in a left column and the image appears in a right column on the same horizontal band.
2. **Given** the same hero, **When** viewed below the medium breakpoint, **Then** the rich text and links appear first and the image appears beneath them, stacked in one column.

---

### User Story 2 - Editor changes nothing in their workflow (Priority: P2)

A content editor who already knows how to fill in a Medium Impact hero (choose the type, write rich text, add up to two links, upload an image) does exactly what they did before and gets the new arrangement automatically.

**Why this priority**: The change must not add admin friction or a migration; existing home content must keep working.

**Independent Test**: Without touching any collection field or admin config, set a hero to "Medium Impact" and verify the new layout renders.

**Acceptance Scenarios**:

1. **Given** the admin hero editor, **When** an editor selects "Medium Impact", **Then** the fields offered are unchanged from today (type, rich text, links, image).
2. **Given** an existing published page already using a Medium Impact hero, **When** the change ships, **Then** the page renders in the new layout with no re-save or data migration.

---

### Edge Cases

- **Hero has text but no image**: the text column fills the available width; no empty image column is shown.
- **Hero has an image but no rich text and no links**: the image is shown; no empty text column gutter is shown.
- **Very long heading / many words in the left column**: the columns stay side by side on wide screens; the row grows in height rather than overflowing horizontally.
- **Narrow desktop windows just above the breakpoint**: both columns remain readable (no text clipped, image not distorted).
- **Image caption** (already supported on this hero): remains associated with the image in the right column.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: On viewports at or above the medium breakpoint, a Medium Impact hero MUST place its rich text and link buttons in a left region and its image in a right region, arranged side by side on the same row.
- **FR-002**: On viewports below the medium breakpoint, a Medium Impact hero MUST stack its content in a single column with the rich text and links first and the image after them.
- **FR-003**: The admin fields for a Medium Impact hero MUST remain exactly as they are today; no new, renamed, or removed fields, and no data migration.
- **FR-004**: When the hero has no image, the layout MUST NOT reserve or show an empty image column; when the hero has no text and no links, the layout MUST NOT reserve or show an empty text column.
- **FR-005**: The two columns MUST be visually balanced (roughly equal share of the row) on wide screens, with vertical alignment that keeps the text and image reading as a pair.
- **FR-006**: All colour and spacing MUST come from the existing design tokens / utility classes; no raw colour literals.
- **FR-007**: The other hero types ("High Impact", "Low Impact", "None") MUST be unaffected.
- **FR-008**: The image caption, where present, MUST continue to render with the image.

### Key Entities

Not applicable — no data model change. The feature only alters how the existing `hero` group (type, rich text, links, image, optional caption) is presented.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On a desktop-width screen, 100% of Medium Impact heroes that have both text and an image render the text and image on the same row (left/right), not stacked.
- **SC-002**: On a mobile-width screen, the same heroes render stacked with text before image.
- **SC-003**: Zero admin configuration changes and zero content edits are required for existing pages to adopt the new layout.
- **SC-004**: No horizontal page scrollbar appears at any common viewport width (320px–1920px) because of the hero.
- **SC-005**: High Impact, Low Impact, and None heroes render identically to before the change.

## Assumptions

- "Chữ bên trái, hình bên phải" applies from the standard medium breakpoint upward; below it the current stacked order (text then image) is kept.
- The two columns split the row roughly in half; no separate editor control for the ratio is wanted.
- Only the Medium Impact hero is in scope. High Impact keeps its full-bleed background image; Low Impact keeps text only.
- The hero is used for the home page "Giới thiệu trung tâm" section, but the change is not special-cased to the home route — any page using a Medium Impact hero gets it.
- The existing `RenderHero` type-switch and the hero field config are the only surfaces involved; no change to the home page render order or the featured-courses section.
