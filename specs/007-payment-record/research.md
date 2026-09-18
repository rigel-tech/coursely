# Research: Payment Record Collection

All items below were unknowns in the Technical Context / field design. Each is resolved by
reading the existing codebase (`src/collections/*`), not by external research, since this
feature is a new Payload collection that must match patterns already established here.

> **Amendment 2026-09-15**: §4's decision to keep `studentId` a plain number is **superseded**
> for `studentId` specifically — it is now a real `relationship` to `students` (`enrollmentId`
> and `recordedBy` are unaffected, still plain numbers as decided below). §3's amount-field
> decision stands, extended with a custom admin `Field` component for live thousands-grouped
> display. `paymentDate` is no longer staff-entered — a `beforeChange` hook sets it on create.
> Full detail: `tasks.md`'s "Amendment — 2026-09-15" section and `data-model.md`.

## 1. Field naming: camelCase in code vs. snake_case in the source DBML

**Decision**: TypeScript field names use camelCase (`enrollmentId`, `studentId`, `amount`,
`paymentMethod`, `paymentDate`, `referenceNote`, `recordedBy`, `proofImage`), not the
DBML's snake_case.

**Rationale**: Every existing collection in this repo (`Students`, `Classes`, `AuditLogs`,
`Notifications`) uses camelCase field names (`fullName`, `verifiedAt`, `createdBy`).
`@payloadcms/db-postgres` converts a camelCase field name to a snake_case column
automatically, so the resulting Postgres columns still match the DBML naming
(`enrollment_id`, `student_id`, ...) without hand-picking snake_case in TypeScript.

**Alternatives considered**: Keep the DBML's snake_case field names verbatim in TS — rejected,
breaks the repo's uniform camelCase convention for zero benefit (the DB column name comes out
the same either way).

## 2. Amount field type for `decimal(12,0)` (whole-VND money)

**Decision**: Payload `number` field, `required: true`, `min: 1`, `admin.step: 1`, plus a
`validate` function rejecting non-integer input (`Number.isInteger`).

**Rationale**: `decimal(12,0)` is a decimal column with **zero** fractional digits — an
integer with a wider range than a 32-bit int, stored as VND with no cents. `admin.step: 1`
(the pattern `Classes.maxStudents` already uses) only affects the browser's stepper UI; it does
not stop a non-integer value arriving over the REST/GraphQL/Local API. Because this is money,
an explicit server-side integer check is warranted rather than trusting the UI affordance
alone.

**Alternatives considered**: `admin.step: 1` alone (no `validate`) — rejected, silently
accepts `12345.5` from any API caller since `step` is admin-UI-only. A custom `decimal`-typed
field — rejected, Payload has no native fixed-point/decimal field type; `number` is the
established fit (see `CoursePhases.sortOrder`, `Classes.maxStudents`).

## 3. `payment_method` as a fixed enum with bilingual labels

**Decision**: `select` field, `required: true`, four options (`CASH`, `BANK_TRANSFER`, `CARD`,
`OTHER`), each with `label: { vi, en }`; field itself also carries `label: { vi, en }`.

**Rationale**: Matches the exact shape already used for fixed-vocabulary fields in
`AuditLogs.action`, `Classes.status`, `Courses.courseType`, and `Notifications.type` — all of
which pair `label: { vi, en }` on the field with `label: { vi, en }` on every option. The
project's `payload.config.ts` already declares `i18n.supportedLanguages: { en, vi }`, so this
is the existing mechanism, not a new one.

**Alternatives considered**: Plain string labels (Vietnamese-only), matching `Students` —
rejected, the requester explicitly asked for bilingual labels and every collection built since
`Students` already does this differently.

## 4. `enrollment_id`, `student_id`, `recorded_by`: plain numbers, not relationships

**Decision**: All three are `number` fields (required for `enrollmentId`/`studentId`,
optional for `recordedBy`), not `relationship` fields.

**Rationale**: Explicit instruction from the requester — foreign keys/relationships are
deferred to a later iteration. `enrollments` does not exist as a collection yet in this repo,
so `enrollmentId` could not be a `relationship` field even if requested.

**Alternatives considered**: N/A — explicitly out of scope per the confirmed spec Assumptions.

## 5. Proof-of-payment image field

**Decision**: `upload` field, `relationTo: 'media'`, not required.

**Rationale**: Mirrors `Students.avatar` exactly (`{ name, type: 'upload', relationTo:
'media' }`) — the only existing upload-field precedent in the repo, and `media` is the one
upload-target collection that exists. Optional because not every payment method yields
photographic evidence (confirmed in spec Assumptions).

## 6. Access control

**Decision**: `authenticated` (from `src/access/authenticated.ts`) for `create`, `read`,
`update`, and `delete`.

**Rationale**: `authenticated` checks `user?.collection === 'users'`, the exact predicate
INVARIANTS.md requires for any staff-only collection, already reused by `Courses`,
`CoursePhases`, `CourseObjectives`, `Classes`, and `Notifications`. Payments is staff-only
financial data with no public-facing read path, so every operation gets the same guard —
unlike `AuditLogs`, which is deliberately append-only (`create`/`update`/`delete` all
`() => false`) because it is a security trail nothing should edit. A payment record, by
contrast, is expected to be correctable by staff (e.g. a mis-entered amount), so allowing
`update`/`delete` behind `authenticated` matches the majority pattern rather than the
audit-log exception.

**Alternatives considered**: Following `AuditLogs`'s append-only shape (`create/update/delete:
() => false` beyond an internal write path) — rejected, nothing in the request suggests
payments are immutable once entered, and unlike audit logs there is no internal-only writer
(staff themselves enter these).

## 7. Admin grouping and list display

**Decision**: `admin.group: adminGroups.academic`, `admin.defaultColumns: ['studentId',
'enrollmentId', 'amount', 'paymentMethod', 'paymentDate']`, no `useAsTitle` override (defaults
to `id`, matching `AuditLogs` and `Notifications`, neither of which has a natural title
field).

**Rationale**: No `finance`/`payments` admin group exists yet in `src/lib/constants/
adminGroups.ts`; adding one is a cross-cutting nav decision outside this request's scope, so
this collection joins `academic` (tuition/course-adjacent data), matching where `Students`,
`Courses`, and `Classes` already sit. `defaultColumns` follows the pattern every
multi-field collection in this repo sets, to make the list view scannable.

**Alternatives considered**: A new `finance` admin group — rejected as unrequested scope
expansion (see CLAUDE.md Principle III); can be introduced later without touching this
collection's config.
