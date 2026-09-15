# Feature Specification: Payment Record Collection

**Feature Branch**: `007-payment-record`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Tạo Payload CMS collection 'Payments' dựa trên schema DBML (enrollment_id, student_id [đổi tên từ user_id], amount, payment_method, payment_date, reference_note, recorded_by, created_at, updated_at) + payment_method enum (CASH/BANK_TRANSFER/CARD/OTHER). Thêm field ảnh bằng chứng thanh toán. Nhãn field cần có cả tiếng Việt và tiếng Anh. Chưa tạo relationship/foreign key cho enrollment_id, student_id, recorded_by ở bước này."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Record a tuition payment (Priority: P1)

An admin staff member (e.g. accountant/receptionist) receives tuition money from a student — in cash, by bank transfer, or by card — and records it in the system so there is a permanent record of what was paid, when, and by whom it was received.

**Why this priority**: This is the core purpose of the feature — without it there is no way to track tuition payments at all. Everything else (proof image, notes) supports this core action.

**Independent Test**: Can be fully tested by creating a payment entry with an enrollment reference, a student, an amount, and a method, and confirming it is saved and retrievable with the payment date stamped automatically.

**Acceptance Scenarios**:

1. **Given** an admin is signed in to the admin panel, **When** they create a new payment with an enrollment id, a student, a positive amount, and a payment method, **Then** the payment record is saved with its payment date automatically set to the save moment, and it appears in the Payments list showing the student's name.
2. **Given** an admin tries to save a payment without an enrollment id, a student, an amount, or a payment method, **When** they submit the form, **Then** the system rejects the save and indicates which required field is missing. (The payment date is never missing — it is filled in automatically, never entered by hand.)
3. **Given** an unauthenticated visitor, **When** they attempt to read or write payment records via the API, **Then** the request is rejected.

---

### User Story 2 - Attach proof of successful payment (Priority: P2)

The staff member attaches a photo of the successful payment (e.g. a bank transfer confirmation screenshot or a receipt photo) to the payment record, so the payment can be verified later if there is a dispute.

**Why this priority**: Valuable evidence for the record, but the payment can still be logged and trusted without it (e.g. cash handed over in person, or a method with no photographic proof).

**Independent Test**: Can be fully tested by uploading an image to an existing payment record and confirming it is stored and displayed alongside that record.

**Acceptance Scenarios**:

1. **Given** an admin is editing a payment record, **When** they upload an image as proof of payment, **Then** the image is attached to that payment record and viewable from it.
2. **Given** a payment record with no proof image attached, **When** it is saved, **Then** the save succeeds (the image is optional).

---

### User Story 3 - Work in either Vietnamese or English (Priority: P3)

An admin using the panel in Vietnamese, and one using it in English, each see every Payments field label in their own language.

**Why this priority**: Usability for a bilingual admin team; the record can still be created correctly even if a label were only in one language, so this is polish rather than core function.

**Independent Test**: Can be fully tested by switching the admin panel language and confirming every Payments field label (and payment-method option) renders in the selected language.

**Acceptance Scenarios**:

1. **Given** the admin panel language is set to Vietnamese, **When** an admin opens the Payments collection, **Then** every field label and payment-method option is shown in Vietnamese.
2. **Given** the admin panel language is set to English, **When** an admin opens the Payments collection, **Then** every field label and payment-method option is shown in English.

---

### Edge Cases

- What happens when an amount of zero or a negative number is entered? System MUST reject it.
- What happens when the same enrollment receives multiple payments (e.g. a deposit and a balance payment)? System MUST allow multiple payment records against the same enrollment id — there is no uniqueness constraint on enrollment_id.
- What happens when `recorded_by` is left blank? System MUST allow it — not every payment entry can be traced to the staff member who entered it (e.g. historical/imported data).
- What happens when a very long reference note is entered? System MUST accept free-form, multi-line text without a hard practical length limit.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a Payments collection in which staff can create a record of one tuition payment received from a student.
- **FR-002**: Each payment record MUST capture: the enrollment it belongs to, the student it belongs to, the amount received, and the payment method.
- **FR-003**: Payment method MUST be restricted to one of a fixed set of values: Cash, Bank Transfer, Card, Other.
- **FR-004**: Amount MUST be a positive whole number, denominated in VND (no fractional/decimal amounts). While entering it, staff MUST see the number grouped with Vietnamese thousands separators as they type (e.g. `1000000` displays as `1.000.000`).
- **FR-005**: Staff MUST be able to attach an optional image as proof of successful payment to a payment record.
- **FR-006**: Staff MUST be able to record an optional free-text note (e.g. receipt number or transfer memo) on a payment record.
- **FR-007**: System MUST allow recording which staff member entered the payment; this is optional (not always known/applicable).
- **FR-008**: The enrollment reference and recording-staff reference MUST be stored as plain numeric identifiers in this iteration — no relationship/foreign key linking to other collections is created yet; that wiring is explicitly deferred to a later iteration. The student reference, however, IS a real relationship to the `students` collection (amended 2026-09-15 — see Assumptions).
- **FR-009**: Every field label and option label on the Payments collection MUST be presented in both Vietnamese and English, matching the admin languages already configured for this project.
- **FR-010**: System MUST automatically record when a payment entry was created and when it was last edited, without staff input.
- **FR-011**: Only authenticated staff MUST be able to create, read, update, or delete payment records; unauthenticated access MUST be rejected.
- **FR-012** (amended 2026-09-15): The payment date MUST NOT be manually entered by staff — it is set automatically to the moment the record is saved, and stays fixed on later edits.
- **FR-013** (added 2026-09-15): The Payments list in the admin panel MUST show the student's full name (falling back to email if no name is on file), not a raw student id or the email-first identification used elsewhere in the admin.

### Key Entities

- **Payment**: One record of tuition money received from a student. Attributes: enrollment reference (number), student (relationship to `students`), amount (VND, whole number), payment method (Cash / Bank Transfer / Card / Other), payment date (system-set, not staff-entered), optional reference note, optional proof-of-payment image, optional staff reference who recorded it, created/updated timestamps.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can record a new tuition payment (all required fields) in under 1 minute.
- **SC-002**: 100% of saved payment records retain their amount, method, and payment date exactly as entered — no silent data loss or truncation.
- **SC-003**: Every Payments field label and payment-method option renders correctly in both Vietnamese and English when the admin panel language is switched.
- **SC-004**: 0% of unauthenticated read or write attempts against payment records succeed.

## Assumptions

- **payment_status is out of scope for this collection.** It is a derived, enrollment-level state (has the enrollment been fully paid, partially paid, or cancelled) computed from the sum of its payments, not an attribute of a single payment — confirmed with the requester. It belongs to a future `enrollments`-related feature, not here.
- `enrollment_id` and `recorded_by` are plain number fields with no relationship/foreign key in this iteration, per explicit instruction; wiring real relationships to `enrollments` and `users` is deferred to a follow-up feature.
- **Amended 2026-09-15**: `student_id` was originally specified the same way (plain number, no relationship). The requester asked mid-implementation for it to become a real relationship to `students`, specifically so the admin list can show the student's name instead of a bare id — implemented as such; this Assumption is corrected here rather than left contradicting the code. `enrollment_id`/`recorded_by` are unaffected — no `enrollments` collection exists yet to point to, and nothing was asked about `recorded_by`.
- **Amended 2026-09-15**: `payment_date` was originally a staff-entered required field (US1 Acceptance Scenario 1, old FR-002). The requester asked for it to be set automatically to the save moment instead, never manually entered — implemented via a `beforeChange` hook that stamps it on create only (an edit later does not shift it). See FR-012.
- The proof-of-payment image is optional: not every payment method yields photographic evidence (e.g. cash handed over in person).
- Payments is a staff-only, authenticated-access collection, consistent with how this project treats other financial/audit-trail data — it is never created, read, or edited by public/unauthenticated site visitors.
- "Bilingual labels" means Payload admin-panel field/option labels in Vietnamese and English (the two admin languages already configured for this project); it does not involve translating stored payment _data_ itself, which is a separate, unrelated concern (content localization) not requested here.
- The collection is grouped under the existing "Academic" admin section, since it concerns tuition for courses/classes and no dedicated Finance section exists yet; creating one is outside this request's scope.
