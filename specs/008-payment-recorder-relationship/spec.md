# Feature Specification: Payment Recorder Relationship

**Feature Branch**: `008-payment-recorder-relationship`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Đổi field `recordedBy` (number) trong collection Payments thành `userId`: relationship (foreign key) tới collection `users`. Mục tiêu cuối: bảng admin Payments hiển thị được student_id và user_id kèm tên + email tương ứng (giống cách studentId đã dùng StudentCell.tsx để resolve tên/email từ relationship tới students) — cần cell component tương tự cho userId. Cần migration đổi field type/rename trong Postgres, cập nhật payload-types.ts, importMap.js, và mọi chỗ tham chiếu recordedBy (kiểm tra migrations cũ, seed helpers, tests liên quan tới Payments)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Identify who recorded a payment (Priority: P1)

A staff member reviewing the Payments admin list wants to see, for each payment, both which student paid and which staff account recorded the transaction — by name and email, not by an opaque internal number.

**Why this priority**: This is the entire point of the change — an ID column with no name/email is not usable for anyone doing day-to-day review. Without it, staff must cross-reference the `users` collection by hand for every row.

**Independent Test**: Open the Payments admin list; the "Recorded By" column shows a person's name (or email if no name) instead of a raw number, the same way the "Student" column already resolves a name/email instead of `studentId`.

**Acceptance Scenarios**:

1. **Given** a payment record where a staff account is designated as having recorded it, **When** a staff member views the Payments admin list, **Then** the "Recorded By" column shows that account's name (falling back to email if no name is set).
2. **Given** a payment record with no designated recorder, **When** a staff member views the Payments admin list, **Then** the "Recorded By" column shows as empty rather than an error or a raw number.
3. **Given** a staff member is creating or editing a payment record, **When** they set "Recorded By", **Then** they pick from actual staff accounts (not a free-typed number).

---

### User Story 2 - Recorded-by values always reference a real account (Priority: P2)

Whoever maintains payment data wants every "Recorded By" value to correspond to an existing staff account, so that the field can never point at an ID that means nothing.

**Why this priority**: Without this, the display in User Story 1 is unreliable — a stale or mistyped number would silently show nothing meaningful, and nobody would notice until a report looked wrong. Lower priority than Story 1 because the visible payoff is the same list, just with the guarantee behind it strengthened.

**Independent Test**: Attempt to save a payment record with a "Recorded By" value that is not one of the selectable staff accounts; this must not be possible through the admin UI (selection is constrained to real accounts, unlike a free-typed number).

**Acceptance Scenarios**:

1. **Given** the payment edit screen, **When** a staff member opens the "Recorded By" field, **Then** the only selectable options are existing staff accounts.

---

### Edge Cases

- A staff account that was set as "Recorded By" on a payment is later deleted: the payment record keeps existing (not blocked/cascaded), and the list falls back to showing the payment with no resolvable name for that column, consistent with how the existing "Student" column already behaves if a referenced student were removed.
- A payment has no "Recorded By" set at all (field left blank): the column renders empty, no error.
- A user account has no name set, only an email: the column falls back to showing the email, matching the existing "Student" column's fallback behavior.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Payments admin list MUST show, for each payment, the account that recorded it as a resolvable name/email rather than a raw numeric ID.
- **FR-002**: The "Recorded By" value MUST be selected from existing staff accounts rather than typed as a free-form number, so every stored value corresponds to a real account.
- **FR-003**: The "Recorded By" field MUST remain optional — a payment record MUST be creatable and saveable with no recorder designated, matching current behavior.
- **FR-004**: If the account referenced by "Recorded By" no longer exists, the Payments admin list MUST still render the row without error (showing no resolvable name for that column).
- **FR-005**: The Payments admin list MUST continue to show the "Student" column resolved to the student's name/email exactly as it does today — no regression to that existing behavior.
- **FR-006**: Every other part of the system that reads or writes the old numeric "Recorded By" value (migrations, seed/test helpers, generated types) MUST be updated to the new relationship-based field so nothing is left referencing a field that no longer exists in that form.

### Key Entities

- **Payment**: A record of a student's payment toward an enrollment. Gains a "Recorded By" relationship pointing at the staff account (a `User`) that logged it, replacing the previous unlinked number. Optional — may be unset.
- **User**: An existing staff account entity (name, email). Newly referenced by `Payment.userId`; no changes to `User` itself.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can identify who recorded any payment in the admin list by reading a name or email directly in the list, with zero manual cross-referencing against another screen.
- **SC-002**: 100% of "Recorded By" values entered through the admin UI going forward correspond to an existing staff account (enforced by selection, not free text).
- **SC-003**: The existing "Student" column behavior in the Payments admin list is unchanged after this feature ships.

## Assumptions

- The `payments` table has not yet been migrated into Postgres (no migration file for it exists yet on this branch), so there is no existing "Recorded By" data to preserve or backfill — this is a pre-launch schema decision, not a data migration of live values.
- "Staff account" means any `users` collection record, consistent with how `recordedBy`'s description already refers to "the staff member" without a narrower role restriction.
- The resolved display (name, falling back to email) mirrors the existing `StudentCell` pattern used for the "Student" column, for visual/behavioral consistency rather than introducing a new convention.
- No delete-protection (preventing deletion of a `User` who has recorded payments) is required — this matches the current lack of such protection on the `Student` relationship.
