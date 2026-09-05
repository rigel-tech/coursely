# Feature Specification: Floating Contact Widget

**Feature Branch**: `007-floating-contact-widget`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Thêm một widget liên hệ nổi (floating contact), cố định ở góc phải dưới màn hình, hiển thị trên mọi trang công khai (không phải admin), gồm 2 nút xếp chồng dọc: (1) 'Chat Zalo' — nút màu xanh (dùng lại token --primary), icon chat, số điện thoại 0987 654 321 (số tạm/placeholder, cần thay bằng số thật sau), bấm vào mở link Zalo (https://zalo.me/0987654321) ở tab mới. (2) 'Gọi hotline' — nút màu cam (dùng lại token --brand-accent), icon điện thoại, số 1900 6789 (giống số ở header hiện tại), bấm vào là link tel:19006789. Widget luôn hiển thị, không có toggle CMS. Đặt trong root layout cạnh Header/Footer, không đụng /admin."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reaching the center by Zalo or phone from anywhere on the site (Priority: P1)

A visitor browsing any public page — the homepage, a course listing, an article —
sees two small, unobtrusive contact buttons fixed to the bottom-right corner of their
screen, staying in place as they scroll. One opens a Zalo chat with the center; the
other starts a phone call to the hotline. Both are reachable without hunting through
the page for contact information.

**Why this priority**: This is the entire feature — a persistent, low-friction way to
reach the center that doesn't depend on which page a visitor happens to be on.

**Independent Test**: Load any public page, scroll down, confirm both buttons stay
fixed in the bottom-right corner, and confirm clicking each opens the expected
destination (Zalo chat in a new tab; the phone dialer for the hotline).

**Acceptance Scenarios**:

1. **Given** a visitor on any public page, **When** the page loads, **Then** both the
   "Chat Zalo" and "Gọi hotline" buttons are visible, fixed to the bottom-right
   corner.
2. **Given** a visitor scrolls the page, **When** they continue scrolling, **Then**
   both buttons remain fixed in place rather than scrolling away.
3. **Given** a visitor clicks "Chat Zalo", **When** the click is handled, **Then** a
   new browser tab opens to a Zalo chat destination for the center's contact number.
4. **Given** a visitor clicks "Gọi hotline", **When** the click is handled, **Then**
   the device's phone dialer opens pre-filled with the hotline number.
5. **Given** a visitor on any `/admin` screen, **When** the page loads, **Then**
   neither button appears — this feature is public-site only.

### Edge Cases

- What happens on a small (mobile) screen where the buttons might overlap other
  fixed UI (e.g. a bottom navigation bar, if one is ever added)? Out of scope for
  this feature — no such fixed bottom UI exists today; this is noted as a future
  consideration, not a requirement here.
- What happens if a page itself has other content anchored to the bottom-right
  (unlikely today, but possible)? Not currently a conflict anywhere in the site;
  addressed if and when it arises.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every public (non-admin) page MUST display two contact controls fixed
  to the bottom-right corner of the viewport, remaining in place while the page
  scrolls.
- **FR-002**: One control MUST open a Zalo chat destination for the center's contact
  number in a new browser tab/window.
- **FR-003**: The other control MUST initiate a phone call to the center's hotline
  number, using the same hotline number already shown in the site header.
- **FR-004**: Both controls MUST be visually distinct from one another (distinct
  color per the palette already in use elsewhere on the site) and MUST each display
  their respective phone number as visible text, not only an icon.
- **FR-005**: Neither control MUST appear on `/admin` screens.
- **FR-006**: The widget MUST NOT require any content-management configuration to
  appear — it is always present on public pages, matching how the header's hotline
  number already works.

### Key Entities

- **Contact number**: A phone number associated with one of the two channels (Zalo,
  voice hotline); the hotline number is shared with the one already shown in the
  header, the Zalo number is a separate, dedicated number for that channel.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A visitor can locate and activate either contact channel from any
  public page in one action (a single click/tap), without needing to scroll to find
  it first.
- **SC-002**: The widget appears on 100% of public pages and 0% of `/admin` screens.

## Assumptions

- The Zalo contact number is a placeholder (`0987 654 321`) supplied for this
  iteration, explicitly acknowledged by the requester as needing replacement with the
  center's real number before this ships to real visitors; the code takes it from one
  clearly-named place so that swap is a one-line change, not a hunt through the
  codebase.
- The hotline number reuses the header's existing hardcoded value (`1900 6789`)
  rather than introducing a second, independently-maintained copy of the same number.
- No new brand color is introduced for the Zalo button; it reuses this site's
  existing blue (`primary`) token, and the hotline button reuses the existing orange
  (`brand-accent`) token already used for other calls-to-action on the site.
- This widget's visibility is unconditional on public pages, matching the header
  hotline's own precedent (no Payload-managed on/off setting is introduced by this
  feature).
