# Feature Specification: Payment Record Collection

**Feature Branch**: `007-payment-record`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Tạo Payload CMS collection 'Payments' dựa trên schema DBML (enrollment_id, student_id [đổi tên từ user_id], amount, payment_method, payment_date, reference_note, recorded_by, created_at, updated_at) + payment_method enum (CASH/BANK_TRANSFER/CARD/OTHER). Thêm field ảnh bằng chứng thanh toán. Nhãn field cần có cả tiếng Việt và tiếng Anh. Chưa tạo relationship/foreign key cho enrollment_id, student_id, recorded_by ở bước này."

**Consolidated (2026-09-18)**: this spec now also covers what were tracked as separate
features `008-payment-recorder-relationship` and `012-enrollment-payments-join` — both are
incremental work on the same Payments collection, not independent features. Their content is
folded in below (User Stories 4–8, FR-014–028, SC-005–011) and their spec folders removed.

**Lifecycle amendment (2026-09-18, later same day)**: a further round of requirements
(User Stories 9–13, FR-029–045, SC-012–017) turns the payment model from "many payments per
enrollment, status chosen by hand" into "**exactly one** payment per enrollment, status
derived". It **supersedes** FR-026, the multi-payment edge case, and User Story 7's third
acceptance scenario — each is marked in place below rather than left to contradict.
Requirement source: requester, 2026-09-18, with six follow-up decisions confirmed the same
day (see Assumptions).

- **008 input**: "Đổi field `recordedBy` (number) trong collection Payments thành `userId`:
  relationship (foreign key) tới collection `users`. Mục tiêu cuối: bảng admin Payments hiển
  thị được student_id và user_id kèm tên + email tương ứng (giống cách studentId đã dùng
  StudentCell.tsx để resolve tên/email từ relationship tới students) — cần cell component
  tương tự cho userId. Cần migration đổi field type/rename trong Postgres, cập nhật
  payload-types.ts, importMap.js, và mọi chỗ tham chiếu recordedBy (kiểm tra migrations cũ,
  seed helpers, tests liên quan tới Payments)."
- **012 input**: "Cho phép một Enrollment có nhiều Payment (hoá đơn thanh toán). Trên trang
  admin: (1) khi xem chi tiết một Enrollment đã lưu, hiển thị danh sách các Payment liên quan
  tới enrollment đó ngay trong trang chi tiết; (2) từ trang chi tiết Enrollment đó, admin có
  thể tạo trực tiếp một hoặc nhiều Payment mới gắn với enrollment này (qua UI join-field 'add
  new' của Payload, mở drawer tạo Payment, dùng đúng field/hook/access hiện có của collection
  Payments — không tạo luồng tạo Payment riêng biệt). Yêu cầu kỹ thuật đã thống nhất: đổi field
  `Payments.enrollmentId` từ kiểu `number` sang `relationship` trỏ tới collection `enrollments`
  (cần migration), và thêm một field kiểu `join` trên collection `Enrollments` trỏ ngược tới
  `Payments` qua field đó để hiển thị/tạo trong trang chi tiết. Việc thêm Payment mới chỉ khả
  dụng sau khi Enrollment đã được lưu (có ID) — không hỗ trợ thêm Payment ngay trong form tạo
  Enrollment mới trước khi lưu."

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

### User Story 4 - Identify who recorded a payment (Priority: P1)

A staff member reviewing the Payments admin list wants to see, for each payment, both which student paid and which staff account recorded the transaction — by name and email, not by an opaque internal number.

**Why this priority**: This is the entire point of the change — an ID column with no name/email is not usable for anyone doing day-to-day review. Without it, staff must cross-reference the `users` collection by hand for every row.

**Independent Test**: Open the Payments admin list; the "Recorded By" column shows a person's name (or email if no name) instead of a raw number, the same way the "Student" column already resolves a name/email instead of `studentId`.

**Acceptance Scenarios**:

1. **Given** a payment record where a staff account is designated as having recorded it, **When** a staff member views the Payments admin list, **Then** the "Recorded By" column shows that account's name (falling back to email if no name is set).
2. **Given** a payment record with no designated recorder, **When** a staff member views the Payments admin list, **Then** the "Recorded By" column shows as empty rather than an error or a raw number.
3. **Given** a staff member is creating or editing a payment record, **When** they set "Recorded By", **Then** they pick from actual staff accounts (not a free-typed number).

---

### User Story 5 - Recorded-by values always reference a real account (Priority: P2)

Whoever maintains payment data wants every "Recorded By" value to correspond to an existing staff account, so that the field can never point at an ID that means nothing.

**Why this priority**: Without this, the display in User Story 4 is unreliable — a stale or mistyped number would silently show nothing meaningful, and nobody would notice until a report looked wrong. Lower priority than Story 4 because the visible payoff is the same list, just with the guarantee behind it strengthened.

**Independent Test**: Attempt to save a payment record with a "Recorded By" value that is not one of the selectable staff accounts; this must not be possible through the admin UI (selection is constrained to real accounts, unlike a free-typed number).

**Acceptance Scenarios**:

1. **Given** the payment edit screen, **When** a staff member opens the "Recorded By" field, **Then** the only selectable options are existing staff accounts.

---

### User Story 6 - View all payments for an enrollment (Priority: P1)

A staff member opens an existing enrollment's detail page in the admin and needs to see every payment recorded against it, without navigating to a separate payments list and filtering manually.

**Why this priority**: This is the core value of the enrollment-join capability — today, correlating an enrollment with its payments requires leaving the enrollment screen entirely. Without this, adding a payment from the enrollment (Story 7) has no listing surface to attach to.

**Independent Test**: Open an enrollment that already has two or more payments recorded against it and confirm all of them appear on the enrollment's detail page.

**Acceptance Scenarios**:

1. **Given** an enrollment with three existing payments, **When** a staff member opens that enrollment's detail page, **Then** all three payments are listed on that page.
2. **Given** an enrollment with no payments, **When** a staff member opens that enrollment's detail page, **Then** the payments section shows an empty state (no payments), not an error.
3. **Given** payments that belong to a different enrollment, **When** a staff member opens an enrollment's detail page, **Then** only payments belonging to that enrollment are listed.

---

### User Story 7 - Add a payment directly from an enrollment (Priority: P2)

A staff member, while viewing a saved enrollment, records a payment the student just made without leaving the enrollment page or re-entering which enrollment it belongs to.

**Why this priority**: This removes the risk of picking the wrong enrollment ID by hand and is the main efficiency gain, but it depends on Story 6 (the listing surface) already existing to attach to.

**Independent Test**: From a saved enrollment's detail page, create a new payment through the on-page control, fill in the required payment fields, save it, and confirm it now appears in that enrollment's payment list with the enrollment link already set correctly — without having to type or look up the enrollment's identifier.

**Acceptance Scenarios**:

1. **Given** a saved enrollment's detail page, **When** a staff member starts creating a new payment from that page and fills in the required fields, **Then** the new payment is saved already linked to that enrollment.
2. **Given** a staff member is creating a payment from an enrollment's detail page, **When** they save it, **Then** the payment goes through the same required fields, validation, and automatic recorder/date stamping that creating a payment anywhere else does.
3. ~~**Given** a staff member has just added one payment from an enrollment's detail page, **When** they add a second payment the same way, **Then** both payments are linked to that same enrollment and both are listed.~~ **Superseded 2026-09-18 by User Story 10**: a second payment is no longer possible — the staff member edits the existing one instead.

---

### User Story 8 - New enrollment has no payments yet (Priority: P3)

A staff member is filling out the form to create a brand-new enrollment that has not been saved yet.

**Why this priority**: This is a boundary/consistency case rather than new capability — it confirms the feature does not attempt (or appear to attempt) something it was explicitly agreed not to support.

**Independent Test**: Start creating a new enrollment and, before saving it for the first time, confirm there is no way to add a payment yet and no broken/error control is shown in its place.

**Acceptance Scenarios**:

1. **Given** a staff member is filling out the form for a brand-new, not-yet-saved enrollment, **When** they look for a way to add a payment, **Then** none is available, and the space where the payment list will appear communicates that payments can be added after saving (no error, no broken control).
2. **Given** a staff member has just saved a brand-new enrollment for the first time, **When** the page reloads to the saved enrollment's detail view, **Then** the control to add a payment is now available.

---

### User Story 9 - Status changes leave an accurate timeline (Priority: P1)

A staff member moves an enrollment through its lifecycle — confirming it, assigning it to a class, or cancelling it — and expects the enrollment's own timestamps to reflect exactly when each of those happened, without filling them in by hand.

**Why this priority**: `confirmedAt`, `classAssignedAt` and `cancelledAt` exist on the enrollment today but nothing ever sets them and staff cannot type into them, so they are permanently blank — a field that looks like a record of when something happened and never is.

**Independent Test**: Change an enrollment's status to CONFIRMED and save; confirm `confirmedAt` now holds the save time. Repeat for ATTENDED → `classAssignedAt` and CANCELLED → `cancelledAt`.

**Acceptance Scenarios**:

1. **Given** an enrollment with status NEW, **When** a staff member changes it to CONFIRMED and saves, **Then** `confirmedAt` is set to the save time and no other timestamp changes.
2. **Given** an enrollment with status CONFIRMED, **When** a staff member changes it to ATTENDED and saves, **Then** `classAssignedAt` is set to the save time.
3. **Given** an enrollment in any status, **When** a staff member changes it to CANCELLED and saves, **Then** `cancelledAt` is set to the save time.
4. **Given** a CONFIRMED enrollment that already has a `confirmedAt`, **When** a staff member saves it again without changing the status, **Then** `confirmedAt` keeps its original value — an unrelated edit never re-stamps it.

---

### User Story 10 - One payment per enrollment, edited rather than duplicated (Priority: P1)

A staff member records the money received for an enrollment. If they later need to correct the amount, the date, or the method, they edit that same record — there is never a second payment row for the same enrollment, and the system will not let one be created even by accident.

**Why this priority**: This is the structural decision the rest of the payment behaviour rests on — with one payment per enrollment, "how much has this enrollment paid" has exactly one answer, and the derived status in User Story 11 is unambiguous.

**Independent Test**: Record a payment against an enrollment, then attempt to create a second one against the same enrollment; the second attempt is rejected, and the existing record is offered for editing instead.

**Acceptance Scenarios**:

1. **Given** an enrollment with no payment, **When** a staff member records one, **Then** it is saved and linked to that enrollment.
2. **Given** an enrollment that already has a payment, **When** anything attempts to create a second payment for it — through the admin panel or any other write path — **Then** the attempt is rejected by the database itself, not merely by an application-level check.
3. **Given** an enrollment that already has a payment, **When** a staff member opens its detail page, **Then** the interface offers editing that existing payment rather than creating a new one.
4. **Given** an enrollment whose payment was recorded for the wrong amount, **When** a staff member edits that payment's amount and saves, **Then** the same record is updated (no new record appears).

---

### User Story 11 - Payment status is derived, never chosen (Priority: P1)

A staff member no longer picks an enrollment's payment status from a dropdown. The system works it out from the amount due on that enrollment and the payment actually recorded against it, so the status can never disagree with the money.

**Why this priority**: A hand-picked status is the single largest source of "the system says paid but no money was recorded" drift. Removing the choice removes the class of error entirely.

**Independent Test**: Set an enrollment's amount due, record a payment for less than it, and confirm the status reads "partially paid" without anyone selecting it; raise the payment to the full amount and confirm it becomes "paid".

**Acceptance Scenarios**:

1. **Given** an enrollment with an amount due and no payment, **When** a staff member views it, **Then** its payment status reads "unpaid" and cannot be changed by hand.
2. **Given** an enrollment with an amount due, **When** a payment for less than that amount is recorded, **Then** its payment status becomes "partially paid" automatically.
3. **Given** an enrollment with an amount due, **When** a payment for that amount or more is recorded, **Then** its payment status becomes "paid" automatically.
4. **Given** an enrollment whose payment was recorded, **When** that payment is later deleted, **Then** the enrollment's payment status returns to "unpaid" automatically.
5. **Given** a "paid" enrollment, **When** a staff member raises its amount due above what was paid, **Then** its payment status becomes "partially paid" automatically.

---

### User Story 12 - The student hears about money received (Priority: P2)

A student is notified when the centre records the money they paid, so they have confirmation the payment landed without having to ask.

**Why this priority**: Real value to the student, but the payment record itself is correct with or without the notification — so it ranks below the data-integrity stories above.

**Independent Test**: Record a payment for an enrollment and confirm a notification appears for that enrollment's student, naming the amount received.

**Acceptance Scenarios**:

1. **Given** a staff member records a payment for an enrollment, **When** the payment is saved, **Then** a notification is raised for that enrollment's student.
2. **Given** the notification system is unavailable or fails, **When** a staff member records a payment, **Then** the payment is still saved successfully — the notification never blocks recording the money.
3. **Given** a staff member edits an existing payment, **When** they save it, **Then** no duplicate "payment recorded" notification is raised (the notification belongs to recording, not to every later correction).

---

### User Story 13 - The amount owed lives on the enrollment (Priority: P2)

A staff member sets how much this particular enrollment owes — which may differ per student (a discount, a scholarship, a negotiated rate) rather than being fixed by the course — and the system uses that figure as the yardstick for the derived payment status.

**Why this priority**: Required input for User Story 11's derivation; separated because it is a distinct piece of data entry with its own value (knowing what a student owes, independent of what they have paid).

**Independent Test**: Set an amount due on an enrollment, confirm it is stored and displayed with Vietnamese thousands separators, and confirm two enrollments on the same course can carry different amounts.

**Acceptance Scenarios**:

1. **Given** a staff member is editing an enrollment, **When** they enter an amount due, **Then** it is saved on that enrollment and displayed grouped with Vietnamese thousands separators.
2. **Given** two enrollments for the same course, **When** different amounts due are set on each, **Then** both are stored independently — the course's own pricing does not override either.

### Edge Cases

- What happens when an amount of zero or a negative number is entered? System MUST reject it.
- ~~What happens when the same enrollment receives multiple payments (e.g. a deposit and a balance payment)? System MUST allow multiple payment records against the same enrollment id — there is no uniqueness constraint on enrollment_id.~~ **Superseded 2026-09-18 by FR-030**: an enrollment carries at most one payment record; a partial payment is recorded by editing that one record's amount, not by adding a second. There IS now a uniqueness constraint on the enrollment reference, enforced in the database.
- What happens when `recorded_by` is left blank? System MUST allow it — not every payment entry can be traced to the staff member who entered it (e.g. historical/imported data).
- What happens when a very long reference note is entered? System MUST accept free-form, multi-line text without a hard practical length limit.
- A staff account set as "Recorded By" on a payment is later deleted: the payment record keeps existing (not blocked/cascaded), and the list falls back to showing no resolvable name for that column, consistent with how the "Student" column already behaves if a referenced student were removed.
- A user account has no name set, only an email: the "Recorded By" column falls back to showing the email, matching the "Student" column's fallback behavior.
- An enrollment is deleted while it still has payments recorded against it: out of scope for this feature to define new behavior — existing deletion rules for enrollments are unchanged, and no new cross-deletion cascade is introduced.
- Two staff members open the same enrollment and each add a payment at nearly the same time: both payments are saved independently and both end up correctly linked to that enrollment; no new locking or conflict behavior is introduced beyond what saving a payment already does today.
- A payment record created before the enrollment-join feature shipped: it is carried forward pointing at the same enrollment it already referenced (see Assumptions), and appears in that enrollment's payment list like any other.
- An enrollment is saved with its status unchanged (only an unrelated field edited): none of `confirmedAt`, `classAssignedAt`, `cancelledAt` are touched.
- An enrollment leaves and re-enters a status (CONFIRMED → CANCELLED → CONFIRMED): the corresponding timestamp is re-stamped to the newer moment, recording the most recent time it entered that status rather than the first.
- An enrollment has no amount due recorded yet but a payment is registered against it: the payment is accepted, and the derived status is "partially paid" — the system cannot claim it is fully paid without knowing what was owed (see Assumptions).
- A payment is recorded for **more** than the amount due: accepted with no warning and no block; the derived status is "paid".
- A payment is recorded for **less** than the amount due: accepted with no warning and no block; the derived status is "partially paid".
- A payment already exists with method "Quẹt thẻ tại quầy" (CARD) when that option is removed: the stored value is carried over to "Khác" (OTHER) so no row is left pointing at a value the system no longer offers.
- Refunds: entirely out of scope. There is no refund record, no negative amount, and no reversal flow in this feature.

## Out of Scope

- **Refunds / reversals** — no refund record type, no negative amounts, no "money returned" state beyond the existing `CANCELLED` payment status value.
- **Multiple / instalment payments per enrollment** — deliberately removed by FR-030; a part payment is one record whose amount is below the amount due.
- **Course-level pricing** — the amount due lives on the enrollment only (FR-029); no price field is added to `Course` or `Class` by this feature.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a Payments collection in which staff can create a record of one tuition payment received from a student.
- **FR-002**: Each payment record MUST capture: the enrollment it belongs to, the student it belongs to, the amount received, and the payment method.
- **FR-003**: Payment method MUST be restricted to one of a fixed set of values: Cash, Bank Transfer, Card, Other.
- **FR-004**: Amount MUST be a positive whole number, denominated in VND (no fractional/decimal amounts). While entering it, staff MUST see the number grouped with Vietnamese thousands separators as they type (e.g. `1000000` displays as `1.000.000`).
- **FR-005**: Staff MUST be able to attach an optional image as proof of successful payment to a payment record.
- **FR-006**: Staff MUST be able to record an optional free-text note (e.g. receipt number or transfer memo) on a payment record.
- **FR-007**: System MUST allow recording which staff member entered the payment; this is optional (not always known/applicable).
- **FR-008**: The enrollment reference and recording-staff reference MUST be stored as plain numeric identifiers in this iteration — no relationship/foreign key linking to other collections is created yet; that wiring is explicitly deferred to a later iteration. The student reference, however, IS a real relationship to the `students` collection (amended 2026-09-15 — see Assumptions). **Fully superseded 2026-09-17**: both deferred references were later wired up — the recording-staff reference by FR-014–019 (008, 2026-09-15) and the enrollment reference by FR-024 (012, 2026-09-17). Kept here only for history; no field remains a plain numeric identifier.
- **FR-009**: Every field label and option label on the Payments collection MUST be presented in both Vietnamese and English, matching the admin languages already configured for this project.
- **FR-010**: System MUST automatically record when a payment entry was created and when it was last edited, without staff input.
- **FR-011**: Only authenticated staff MUST be able to create, read, update, or delete payment records; unauthenticated access MUST be rejected.
- **FR-012** (amended 2026-09-15): The payment date MUST NOT be manually entered by staff — it is set automatically to the moment the record is saved, and stays fixed on later edits.
- **FR-013** (added 2026-09-15): The Payments list in the admin panel MUST show the student's full name (falling back to email if no name is on file), not a raw student id or the email-first identification used elsewhere in the admin.
- **FR-014** (added 2026-09-15, from 008): The Payments admin list MUST show, for each payment, the account that recorded it as a resolvable name/email rather than a raw numeric ID.
- **FR-015** (added 2026-09-15, from 008): The "Recorded By" value MUST be selected from existing staff accounts (a real relationship to `users`) rather than typed as a free-form number, so every stored value corresponds to a real account.
- **FR-016** (added 2026-09-15, from 008): The "Recorded By" field MUST remain optional — a payment record MUST be creatable and saveable with no recorder designated.
- **FR-017** (added 2026-09-15, from 008): If the account referenced by "Recorded By" no longer exists, the Payments admin list MUST still render the row without error (showing no resolvable name for that column).
- **FR-018** (added 2026-09-15, from 008): The Payments admin list MUST continue to show the "Student" column resolved to the student's name/email exactly as before — no regression to that existing behavior.
- **FR-019** (added 2026-09-15, from 008): Every other part of the system that reads or writes the old numeric "Recorded By" value (migrations, seed/test helpers, generated types) MUST be updated to the new relationship-based field so nothing is left referencing a field that no longer exists in that form.
- **FR-020** (added 2026-09-17, from 012): The system MUST show, on a saved enrollment's detail page, the list of every payment linked to that enrollment.
- **FR-021** (added 2026-09-17, from 012): The system MUST show an explicit empty state on an enrollment's detail page when that enrollment has no payments, rather than an error or a blank gap.
- **FR-022** (added 2026-09-17, from 012): The system MUST only list payments belonging to the enrollment being viewed — never payments belonging to other enrollments.
- **FR-023** (added 2026-09-17, from 012): The system MUST allow a staff member to create a new payment directly from a saved enrollment's detail page.
- **FR-024** (added 2026-09-17, from 012): A payment created from an enrollment's detail page MUST be saved already linked to that enrollment, without the staff member manually selecting or typing the enrollment. This requires `Payments.enrollmentId` to be a real `relationship` to `enrollments` (superseding FR-008 above for `enrollmentId` specifically — `recorded_by`/`userId` is covered separately by FR-014–019).
- **FR-025** (added 2026-09-17, from 012): A payment created from an enrollment's detail page MUST be subject to the same required fields, validation rules, and automatic field stamping (e.g. recorder, payment date) as a payment created any other way.
- ~~**FR-026** (added 2026-09-17, from 012): A staff member MUST be able to add more than one payment to the same enrollment, one after another.~~ **Superseded 2026-09-18 by FR-030**: an enrollment now carries at most one payment, and a second one is rejected at the database level.
- **FR-027** (added 2026-09-17, from 012): The system MUST NOT offer a way to add a payment to an enrollment that has not yet been saved for the first time.
- **FR-028** (added 2026-09-17, from 012): The system MUST continue to correctly associate every existing payment record with the enrollment it already belongs to after this feature ships — no existing payment loses or changes its enrollment association.

#### Lifecycle amendment (added 2026-09-18)

- **FR-029**: An enrollment MUST carry its own amount due, in VND whole numbers, settable per enrollment and independent of the course's own pricing. It MUST be displayed grouped with Vietnamese thousands separators, consistent with the payment amount.
- **FR-030**: An enrollment MUST have at most one payment record. A second payment against the same enrollment MUST be rejected **by the database**, not only by an application-level check.
- **FR-031**: When an enrollment already has a payment, the admin interface MUST offer editing that record instead of creating another one.
- **FR-032**: An enrollment's payment status MUST be derived by the system and MUST NOT be selectable by staff.
- **FR-033**: The derivation MUST be: no payment recorded → UNPAID; payment amount greater than or equal to the amount due → PAID; payment amount greater than zero but below the amount due → PARTIALLY_PAID; payment recorded while no amount due is set → PARTIALLY_PAID.
- **FR-034**: The derived payment status MUST be recomputed whenever the enrollment's payment is created, edited, or deleted, and whenever the enrollment's own amount due changes.
- **FR-035**: A payment's amount MUST NOT be validated against the amount due — below, equal to, and above it are all recorded normally, with no warning and no block.
- **FR-036**: Payment method MUST be restricted to exactly three values: Cash, Bank Transfer, Other. The previously available "Card" value MUST be removed, and any record already carrying it MUST be carried over to "Other".
- **FR-037**: Recording a payment MUST raise a notification for the student the enrollment belongs to.
- **FR-038**: A failure to raise that notification MUST NOT prevent the payment from being saved.
- **FR-039**: Editing an existing payment MUST NOT raise a further "payment recorded" notification.
- **FR-040**: When an enrollment is saved with its status newly changed to CONFIRMED, the system MUST set `confirmedAt` to the save time.
- **FR-041**: When an enrollment is saved with its status newly changed to ATTENDED, the system MUST set `classAssignedAt` to the save time.
- **FR-042**: When an enrollment is saved with its status newly changed to CANCELLED, the system MUST set `cancelledAt` to the save time.
- **FR-043**: Saving an enrollment without changing its status MUST NOT alter `confirmedAt`, `classAssignedAt`, or `cancelledAt`; those three MUST remain staff-uneditable.
- **FR-044**: The enrollment and payment creation forms MUST show the signed-in staff account's email in "Admin tạo đơn" / "Người ghi nhận" **before** the record is saved, and both MUST remain uneditable.
- **FR-045**: An enrollment with no payment MUST show its payment section as the create action alone, without the generic empty-list explanatory text.
- **FR-046** (reconfirmed 2026-09-18): `paymentDate` remains system-set to the save moment and staff-uneditable — confirming FR-012 against a later request to make it a hand-entered transaction date, which was withdrawn.
- **FR-047** (reconfirmed 2026-09-18): the reference/receipt information remains a single free-text field (`referenceNote`), not split into a separate code and note, and the optional proof-of-payment image is retained unchanged.

### Key Entities

- **Payment**: The single record of tuition money received for one enrollment (FR-030). Attributes: enrollment reference (relationship to `enrollments`, unique — FR-030), student (relationship to `students`), amount (VND, whole number, never checked against the amount due — FR-035), payment method (Cash / Bank Transfer / Other — FR-036), payment date (system-set, not staff-entered — FR-046), optional reference note, optional proof-of-payment image, "Recorded By" (relationship to `users`, optional), created/updated timestamps.
- **Enrollment**: A student's registration for a course. Gains its own **amount due** (FR-029), a **derived** payment status that staff cannot choose (FR-032–034), and system-managed status timestamps recording the most recent time it entered CONFIRMED / ATTENDED / CANCELLED (FR-040–043). Shows its one payment on its own detail page (FR-020–028, FR-031).
- **User**: An existing staff account entity (name, email). Referenced by `Payment.userId` as who recorded the payment and by `Enrollment.createdBy` as who created the enrollment; no changes to `User` itself.
- **Notification**: Gains a "payment recorded" kind, raised for the student when their enrollment's payment is first recorded (FR-037–039).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can record a new tuition payment (all required fields) in under 1 minute.
- **SC-002**: 100% of saved payment records retain their amount, method, and payment date exactly as entered — no silent data loss or truncation.
- **SC-003**: Every Payments field label and payment-method option renders correctly in both Vietnamese and English when the admin panel language is switched.
- **SC-004**: 0% of unauthenticated read or write attempts against payment records succeed.
- **SC-005** (from 008): A staff member can identify who recorded any payment in the admin list by reading a name or email directly in the list, with zero manual cross-referencing against another screen.
- **SC-006** (from 008): 100% of "Recorded By" values entered through the admin UI going forward correspond to an existing staff account (enforced by selection, not free text).
- **SC-007** (from 008): The existing "Student" column behavior in the Payments admin list is unchanged after this feature ships.
- **SC-008** (from 012): A staff member can find every payment for a given enrollment in one screen, with zero additional navigation or filtering steps, 100% of the time.
- **SC-009** (from 012): A staff member can record a new payment for an enrollment without ever manually entering or selecting which enrollment it belongs to.
- **SC-010** (from 012): Every payment that existed before the enrollment-join feature shipped is still shown under the correct enrollment afterward — zero payments become orphaned or mis-linked.
- ~~**SC-011** (from 012): A staff member recording two payments for the same enrollment in one sitting needs no more than one extra step per payment compared to the single-payment flow.~~ **Superseded 2026-09-18**: two payments per enrollment are no longer possible (FR-030).
- **SC-012** (2026-09-18): 0% of enrollments end up with more than one payment record, under any write path, including concurrent attempts.
- **SC-013** (2026-09-18): 100% of enrollments' payment status agrees with the money actually recorded against them — no enrollment reads "paid" without a payment covering its amount due.
- **SC-014** (2026-09-18): 0 staff-initiated changes to payment status are possible; every value it holds was computed by the system.
- **SC-015** (2026-09-18): 100% of enrollments that reach CONFIRMED, ATTENDED, or CANCELLED carry the corresponding timestamp, with zero manual entry.
- **SC-016** (2026-09-18): 100% of recorded payments produce a student notification, and 0% of notification failures prevent the payment from being saved.
- **SC-017** (2026-09-18): A staff member can see which account will be recorded as creator/recorder before saving, on 100% of enrollment and payment creations.

## Assumptions

- **payment_status is out of scope for this collection.** It is a derived, enrollment-level state (has the enrollment been fully paid, partially paid, or cancelled) computed from the sum of its payments, not an attribute of a single payment — confirmed with the requester. It belongs to a future `enrollments`-related feature, not here.
- `enrollment_id` and `recorded_by` are plain number fields with no relationship/foreign key in this iteration, per explicit instruction; wiring real relationships to `enrollments` and `users` is deferred to a follow-up feature.
- **Amended 2026-09-15**: `student_id` was originally specified the same way (plain number, no relationship). The requester asked mid-implementation for it to become a real relationship to `students`, specifically so the admin list can show the student's name instead of a bare id — implemented as such; this Assumption is corrected here rather than left contradicting the code. `enrollment_id`/`recorded_by` are unaffected — no `enrollments` collection exists yet to point to, and nothing was asked about `recorded_by`.
- **Amended 2026-09-15**: `payment_date` was originally a staff-entered required field (US1 Acceptance Scenario 1, old FR-002). The requester asked for it to be set automatically to the save moment instead, never manually entered — implemented via a `beforeChange` hook that stamps it on create only (an edit later does not shift it). See FR-012.
- The proof-of-payment image is optional: not every payment method yields photographic evidence (e.g. cash handed over in person).
- Payments is a staff-only, authenticated-access collection, consistent with how this project treats other financial/audit-trail data — it is never created, read, or edited by public/unauthenticated site visitors.
- "Bilingual labels" means Payload admin-panel field/option labels in Vietnamese and English (the two admin languages already configured for this project); it does not involve translating stored payment _data_ itself, which is a separate, unrelated concern (content localization) not requested here.
- The collection is grouped under the existing "Academic" admin section, since it concerns tuition for courses/classes and no dedicated Finance section exists yet; creating one is outside this request's scope.
- **From 008**: the `payments` table had not been migrated into Postgres yet when `recordedBy` became `userId`, so there was no existing "Recorded By" data to preserve or backfill — a pre-launch schema decision, not a data migration of live values.
- **From 008**: "Staff account" means any `users` collection record, with no narrower role restriction. The resolved display (name, falling back to email) mirrors the existing `StudentCell` pattern for visual/behavioral consistency. No delete-protection (preventing deletion of a `User` who has recorded payments) is required, matching the lack of such protection on the `Student` relationship.
- **From 012**: every existing payment's `enrollmentId` value referred to an enrollment that actually exists, so the migration converting that field to a verified relationship did not need to handle orphaned or invalid values.
- **From 012**: "Staff member" means any user role that already has access to view and edit both enrollments and payments — this did not change who can see or create payments, only how a payment gets associated with an enrollment.
- **From 012**: the visual placement and wording of the payment list and "add payment" control on the enrollment detail page follow the admin system's existing conventions for showing related records (Payload's `join` field); no new visual design was specified beyond that. Deleting an enrollment that still has payments, and any cascading behavior that results, is unchanged and not newly defined here.

### Lifecycle amendment decisions (confirmed with the requester, 2026-09-18)

- **`paymentDate` stays system-set.** The requirement list that opened this amendment described it as "ngày giao dịch thực tế" (the real transaction date), which would have made it hand-entered; the requester confirmed the opposite — "không được nhập tay". FR-012/FR-046 therefore stand unchanged, and no field work is needed for it.
- **"Card" is removed for real**, not merely omitted from a shorthand list — the requester confirmed the Postgres enum is to be recreated. Postgres cannot drop an enum value in place, so the type must be rebuilt (rename → create → cast → drop), carrying any existing `CARD` row over to `OTHER`.
- **Reference information stays one field.** The amendment's phrasing ("mã tham chiếu, ghi chú") reads as two fields; the requester confirmed keeping the existing single `referenceNote`. The proof-of-payment image is likewise retained, despite not appearing in the amendment's field list.
- **The amount due lives on the enrollment, not the course** — chosen so a discount, scholarship, or negotiated rate applies to one student without touching course pricing. No price field is added to `Course`/`Class`.
- **Payment status becomes fully derived and unselectable** — a direct consequence of one payment per enrollment: with a single amount to compare against a single amount due, there is nothing left for a human to judge, and a hand-set value could only ever disagree with the money.
- **Refunds are out of scope**, confirmed explicitly. The existing `CANCELLED` payment-status value is therefore unreachable through the derivation in FR-033; it is left in place rather than removed, since removing it would mean rebuilding another Postgres enum for a value no current data uses. **Open**: whether a CANCELLED _enrollment_ should force its payment status to CANCELLED is not decided here — until it is, a cancelled enrollment keeps whatever the money-based derivation produced.
- **An enrollment with no amount due set** cannot be proven fully paid, so a payment against it derives PARTIALLY_PAID rather than PAID (FR-033). This keeps the amount due optional instead of forcing a backfilled value onto every existing enrollment.
- **The notification fires on recording only** (FR-039), matching how `ENROLLMENT_CREATED` already behaves — raised once at the creating moment, fire-and-forget, never re-raised by later edits.

## Implementation Plan (staged)

Each stage is independently shippable and verified before the next begins.

### Stage 1 — One payment per enrollment, enforced in the database

- Replace the non-unique `payments_enrollment_id_idx` with a unique index on the enrollment reference, defined **twice** — in `afterSchemaInit` (what dev/test's drizzle-push reads) and as a hand-written migration (what prod runs) — following the precedent of `enrollments_active_student_course_idx`.
- Add an `INVARIANTS.md` entry for the new index, mirroring the existing "defined twice — keep both in sync" entry, since the same silent-divergence trap now applies to a second index.
- Invert `tests/int/enrollments-payments-join.spec.ts`'s "lets a staff member add two payments" case into "rejects the second payment", and give each case in `tests/int/payments-collection.spec.ts` its own enrollment (18 payment-creating calls currently share one).
- Hide the create affordance once a payment exists (FR-031). `admin.allowCreate` on a join field is a static boolean, not a predicate, so this needs either a small custom field wrapper or acceptance that the button stays and the database rejects the duplicate with a clear message.

### Stage 2 — Amount due on the enrollment, derived payment status

- Add `amountDue` to `Enrollments` (VND whole number, optional), reusing the existing `formatAmountDisplay` grouping for both its input and its list cell.
- Make `paymentStatus` read-only in the admin and derive it per FR-033 in a `src/services/payments.ts` helper (no `'use server'` — it is internal logic, per the service/action split this repo enforces with a test).
- Recompute from both directions (FR-034): a Payments `afterChange`/`afterDelete` hook updates the owning enrollment; an Enrollments `beforeChange` hook recomputes when `amountDue` changes.

### Stage 3 — Payment method enum, student notification

- Rebuild `enum_payments_payment_method` as three values, carrying any `CARD` row to `OTHER`.
- Add a `PAYMENT_RECORDED` notification kind: collection option, `ALTER TYPE ... ADD VALUE` migration (irreversible, as with `ENROLLMENT_CREATED`), a template under `src/notifications/templates/`, and a fire-and-forget call from the Payments `afterChange` hook on create only — mirroring `notifyEnrollmentCreated`.

### Stage 4 — Enrollment status timestamps, creator display, empty state

- Stamp `confirmedAt` / `classAssignedAt` / `cancelledAt` on status transitions only (FR-040–043).
- Show the signed-in staff account's email in `createdBy` / `userId` before saving (FR-044) — a read-only client-side display; the persisted value still comes from the existing server-side hooks.
- Remove the generic empty-list text from the enrollment's payments section only (FR-045).

### Not in any stage

Refunds, instalments, and course-level pricing — see **Out of Scope**.
