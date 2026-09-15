# Phase 1 Data Model: Payment Recorder Relationship

## Payment (`payments` collection — `src/collections/Payments/index.ts`)

Only the changed field is detailed; all other fields (`enrollmentId`, `amount`,
`paymentMethod`, `paymentDate`, `referenceNote`, `proofImage`) are unchanged.

| Field                   | Before                                               | After                                                                                             |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `recordedBy` → `userId` | `type: 'number'`, optional, no admin `Cell` override | `type: 'relationship'`, `relationTo: 'users'`, optional, `admin.components.Cell` → `RecorderCell` |

**Validation rules**:

- Not required (FR-003) — matches current `recordedBy`.
- No custom `validate` needed beyond Payload's own relationship-id existence check, which
  is what gives FR-002 ("every stored value corresponds to a real account") for free —
  the admin UI's relationship picker only offers existing `users` documents.

**Relationships**:

- `Payment.userId` → `User` (`users` collection), many-to-one, optional, no cascade/delete
  restriction (see research.md).

**State transitions**: None — this is a static reference field, not a workflow state.

## User (`users` collection)

No changes. Referenced read-only by `Payment.userId` for display (`fullName`, built-in
`email`).

## Admin list column (`Payments.admin.defaultColumns`)

`recordedBy` was never in `defaultColumns` (`['studentId', 'enrollmentId', 'amount',
'paymentMethod', 'paymentDate']`). FR-001 requires the recorder to be visible in the list,
so `userId` is added to `defaultColumns`, paired with its new `RecorderCell`.
