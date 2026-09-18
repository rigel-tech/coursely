# Data Model: Payment Record Collection

## Entity: Payment (`payments` collection, slug `payments`)

One record of tuition money received from a student against one enrollment.

| Field (TS name) | Payload type                                | Required | Notes                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enrollmentId`  | `number`                                    | yes      | Plain numeric identifier. **No relationship** to an `enrollments` collection yet — deferred (see spec Assumptions).                                                                                                                                                                                                                            |
| `studentId`     | `relationship` (`relationTo: 'students'`)   | yes      | **Amended 2026-09-15**: real relationship, not a plain number — see spec Assumptions. Admin list `Cell` shows the student's `fullName` (falls back to `email`) instead of Payload's default `useAsTitle` display.                                                                                                                              |
| `amount`        | `number`                                    | yes      | Whole VND, no decimals (`decimal(12,0)` in source schema). `min: 1`; server-side validated as an integer (see research.md §2). **Amended 2026-09-15**: admin edit form uses a custom `Field` component (`AmountField`) that displays/accepts Vietnamese thousands-grouped input (`1.000.000`) while storing/validating the same plain integer. |
| `paymentMethod` | `select`                                    | yes      | One of `CASH`, `BANK_TRANSFER`, `CARD`, `OTHER`. Bilingual field + option labels.                                                                                                                                                                                                                                                              |
| `paymentDate`   | `date` (day + time), `admin.readOnly: true` | yes      | **Amended 2026-09-15**: no longer staff-entered. A `beforeChange` hook (`setPaymentDate`) stamps it to the save moment on `create` only — an update never shifts it.                                                                                                                                                                           |
| `referenceNote` | `textarea`                                  | no       | Free text: receipt number, transfer memo, etc.                                                                                                                                                                                                                                                                                                 |
| `proofImage`    | `upload` (`relationTo: 'media'`)            | no       | Screenshot/photo evidence of a successful payment.                                                                                                                                                                                                                                                                                             |
| `recordedBy`    | `number`                                    | no       | Plain numeric identifier of the staff member who entered the payment. **No relationship** to `users` yet — deferred. Optional: not always known (e.g. historical/imported data).                                                                                                                                                               |
| `createdAt`     | `date` (auto)                               | —        | Payload `timestamps: true`. When the row was entered into the system.                                                                                                                                                                                                                                                                          |
| `updatedAt`     | `date` (auto)                               | —        | Payload `timestamps: true`. When the row was last edited.                                                                                                                                                                                                                                                                                      |

### Validation rules

- `amount` must be a positive integer (`Number.isInteger(value) && value >= 1`).
- `paymentMethod` must be one of the four fixed options — enforced by Payload's `select`
  field itself (unknown values are rejected).
- No cross-field validation: `enrollmentId` and `recordedBy` are opaque numbers in this
  iteration (not checked against any other collection, since no relationship exists yet —
  see spec Assumptions). `studentId` **is** validated against `students` — Payload rejects a
  relationship value that does not resolve to a real document.

### Relationships

`studentId` → `students` (real relationship, amended 2026-09-15). `enrollmentId` and
`recordedBy` are still plain numbers that _will_ become `relationship` fields pointing at
`enrollments` and `users` respectively in a future feature — explicitly out of scope here.

### State / lifecycle

No state machine on `Payment` itself. (The derived `payment_status` — whether an enrollment
is unpaid/partially paid/paid/cancelled — belongs to a future `enrollments`-level feature, not
to this collection; confirmed with the requester, see spec Assumptions.)

### Access control

`create`, `read`, `update`, `delete` all gated by `authenticated` (staff-only,
`user.collection === 'users'`). No public/unauthenticated access in any direction.
