# Feature Specification: Enrollment Payments Join

**Feature Branch**: `012-enrollment-payments-join`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: "Cho phép một Enrollment có nhiều Payment (hoá đơn thanh toán). Trên trang admin: (1) khi xem chi tiết một Enrollment đã lưu, hiển thị danh sách các Payment liên quan tới enrollment đó ngay trong trang chi tiết; (2) từ trang chi tiết Enrollment đó, admin có thể tạo trực tiếp một hoặc nhiều Payment mới gắn với enrollment này (qua UI join-field 'add new' của Payload, mở drawer tạo Payment, dùng đúng field/hook/access hiện có của collection Payments — không tạo luồng tạo Payment riêng biệt). Yêu cầu kỹ thuật đã thống nhất: đổi field `Payments.enrollmentId` từ kiểu `number` sang `relationship` trỏ tới collection `enrollments` (cần migration), và thêm một field kiểu `join` trên collection `Enrollments` trỏ ngược tới `Payments` qua field đó để hiển thị/tạo trong trang chi tiết. Việc thêm Payment mới chỉ khả dụng sau khi Enrollment đã được lưu (có ID) — không hỗ trợ thêm Payment ngay trong form tạo Enrollment mới trước khi lưu."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View all payments for an enrollment (Priority: P1)

A staff member opens an existing enrollment's detail page in the admin and needs to see every payment recorded against it, without navigating to a separate payments list and filtering manually.

**Why this priority**: This is the core value of the feature — today, correlating an enrollment with its payments requires leaving the enrollment screen entirely. Without this, the rest of the feature has no purpose.

**Independent Test**: Open an enrollment that already has two or more payments recorded against it (created however they exist today) and confirm all of them appear on the enrollment's detail page.

**Acceptance Scenarios**:

1. **Given** an enrollment with three existing payments, **When** a staff member opens that enrollment's detail page, **Then** all three payments are listed on that page.
2. **Given** an enrollment with no payments, **When** a staff member opens that enrollment's detail page, **Then** the payments section shows an empty state (no payments), not an error.
3. **Given** payments that belong to a different enrollment, **When** a staff member opens an enrollment's detail page, **Then** only payments belonging to that enrollment are listed.

---

### User Story 2 - Add a payment directly from an enrollment (Priority: P2)

A staff member, while viewing a saved enrollment, records a payment the student just made without leaving the enrollment page or re-entering which enrollment it belongs to.

**Why this priority**: This removes the current risk of picking the wrong enrollment ID by hand and is the main efficiency gain, but it depends on User Story 1 (the listing surface) already existing to attach to.

**Independent Test**: From a saved enrollment's detail page, create a new payment through the on-page control, fill in the required payment fields, save it, and confirm it now appears in that enrollment's payment list with the enrollment link already set correctly — without having to type or look up the enrollment's identifier.

**Acceptance Scenarios**:

1. **Given** a saved enrollment's detail page, **When** a staff member starts creating a new payment from that page and fills in the required fields, **Then** the new payment is saved already linked to that enrollment.
2. **Given** a staff member is creating a payment from an enrollment's detail page, **When** they save it, **Then** the payment goes through the same required fields, validation, and automatic recorder/date stamping that creating a payment anywhere else does.
3. **Given** a staff member has just added one payment from an enrollment's detail page, **When** they add a second payment the same way, **Then** both payments are linked to that same enrollment and both are listed.

---

### User Story 3 - New enrollment has no payments yet (Priority: P3)

A staff member is filling out the form to create a brand-new enrollment that has not been saved yet.

**Why this priority**: This is a boundary/consistency case rather than new capability — it confirms the feature does not attempt (or appear to attempt) something it was explicitly agreed not to support.

**Independent Test**: Start creating a new enrollment and, before saving it for the first time, confirm there is no way to add a payment yet and no broken/error control is shown in its place.

**Acceptance Scenarios**:

1. **Given** a staff member is filling out the form for a brand-new, not-yet-saved enrollment, **When** they look for a way to add a payment, **Then** none is available, and the space where the payment list will appear communicates that payments can be added after saving (no error, no broken control).
2. **Given** a staff member has just saved a brand-new enrollment for the first time, **When** the page reloads to the saved enrollment's detail view, **Then** the control to add a payment is now available.

### Edge Cases

- An enrollment is deleted while it still has payments recorded against it: out of scope for this feature to define new behavior — existing deletion rules for enrollments are unchanged, and no new cross-deletion cascade is introduced.
- Two staff members open the same enrollment and each add a payment at nearly the same time: both payments are saved independently and both end up correctly linked to that enrollment; no new locking or conflict behavior is introduced beyond what saving a payment already does today.
- A payment record created before this feature shipped: it is carried forward pointing at the same enrollment it already referenced (see Assumptions), and appears in that enrollment's payment list like any other.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST show, on a saved enrollment's detail page, the list of every payment linked to that enrollment.
- **FR-002**: The system MUST show an explicit empty state on an enrollment's detail page when that enrollment has no payments, rather than an error or a blank gap.
- **FR-003**: The system MUST only list payments belonging to the enrollment being viewed — never payments belonging to other enrollments.
- **FR-004**: The system MUST allow a staff member to create a new payment directly from a saved enrollment's detail page.
- **FR-005**: A payment created from an enrollment's detail page MUST be saved already linked to that enrollment, without the staff member manually selecting or typing the enrollment.
- **FR-006**: A payment created from an enrollment's detail page MUST be subject to the same required fields, validation rules, and automatic field stamping (e.g. recorder, payment date) as a payment created any other way.
- **FR-007**: A staff member MUST be able to add more than one payment to the same enrollment, one after another.
- **FR-008**: The system MUST NOT offer a way to add a payment to an enrollment that has not yet been saved for the first time.
- **FR-009**: The system MUST continue to correctly associate every existing payment record with the enrollment it already belongs to after this feature ships — no existing payment loses or changes its enrollment association.

### Key Entities

- **Enrollment**: A student's registration for a course. Gains a visible, on-page collection of the payments associated with it.
- **Payment**: A record of a payment made toward an enrollment. Its link to an enrollment becomes the basis for grouping payments under the enrollment they belong to, replacing a link that today is stored as a plain identifier rather than a verified association.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can find every payment for a given enrollment in one screen, with zero additional navigation or filtering steps, 100% of the time.
- **SC-002**: A staff member can record a new payment for an enrollment without ever manually entering or selecting which enrollment it belongs to.
- **SC-003**: Every payment that existed before this feature shipped is still shown under the correct enrollment afterward — zero payments become orphaned or mis-linked.
- **SC-004**: A staff member recording two payments for the same enrollment in one sitting needs no more than one extra step per payment compared to the current single-payment flow.

## Assumptions

- Every existing payment's current `enrollmentId` value refers to an enrollment that actually exists; the migration converting that field to a verified relationship does not need to handle orphaned or invalid values, since none are expected in current data.
- "Staff member" here means any user role that already has access to view and edit both enrollments and payments today — this feature does not change who can see or create payments, only how a payment gets associated with an enrollment.
- The visual placement and exact wording of the payment list and "add payment" control on the enrollment detail page follow the admin system's existing conventions for showing related records; no new visual design is specified beyond that.
- Deleting an enrollment that still has payments, and any cascading behavior that results, is unchanged by this feature and is not newly defined here.
