# Phase 1 Data Model: Admin Notification Bell

## `Notification` (existing collection, specs/010 — amended)

| Field      | Type                      | Required             | Notes                                                                                                                    |
| ---------- | ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `student`  | relationship → `students` | **no** (was `yes`)   | Absent/`null` ⇒ staff-facing (Q1). Present ⇒ that student's own notification, unchanged from specs/010.                  |
| `type`     | select                    | yes                  | Unchanged. `ACCOUNT_CREATED` is reclassified staff-facing (Q2) — no new option added.                                    |
| `title`    | text                      | yes                  | Unchanged.                                                                                                               |
| `content`  | textarea                  | yes                  | Unchanged.                                                                                                               |
| `metadata` | json                      | no                   | Unchanged.                                                                                                               |
| `isRead`   | checkbox                  | no (default `false`) | Unchanged in shape. For a staff-facing row, "read" is shared team-wide (Q1) — one flag on the row, not per-staff-member. |

No new collection, no new field. The only schema change is `student`'s `required: true` →
dropped, carried by:

- `src/collections/Notifications/index.ts` (Payload field config — drives `drizzle-kit push` for
  dev/`tests/int`).
- a new hand-written migration `ALTER COLUMN "student_id" DROP NOT NULL` (drives
  `prodMigrations`) — see `research.md` Decision 4.

## Audience rule (derived, not stored)

"Staff-facing" vs "student-facing" is not a stored enum — it is read off whether `student` is set:

- `student` present → visible only to that one student, via `student-notifications.ts`'s existing
  `where: { student: { equals: studentId } }` (unchanged query, satisfies FR-003 by construction:
  a null/absent `student` can never equal a specific id).
- `student` absent → visible to every signed-in staff member, via the admin bell's
  `where: { student: { exists: false } }` REST queries (research.md Decisions 2–3).

## `CreateNotificationInput` (existing type, `src/notifications/create.ts` — amended)

| Field       | Type                       | Required           | Notes                                                 |
| ----------- | -------------------------- | ------------------ | ----------------------------------------------------- |
| `studentId` | `number`                   | **no** (was `yes`) | Omit to create a staff-facing/broadcast notification. |
| `type`      | `Notification['type']`     | yes                | Unchanged.                                            |
| `title`     | `Notification['title']`    | yes                | Unchanged.                                            |
| `content`   | `Notification['content']`  | yes                | Unchanged.                                            |
| `metadata`  | `Notification['metadata']` | no                 | Unchanged.                                            |

`createNotification`'s write includes a `student` key in `data` only when `studentId` is present
(research.md Decision 5) — never `student: undefined`.

## No new REST/Server Action contracts

Per research.md Decision 1, the admin bell is a pure consumer of Payload's own generated REST
endpoints for the `notifications` collection — nothing under `src/actions/` or `/next/*` is added
for this feature. The three calls it makes are documented in research.md Decisions 2–3:

- `GET  {apiRoute}/notifications/count?where[student][exists]=false&where[isRead][equals]=false`
- `GET  {apiRoute}/notifications?where[student][exists]=false&sort=-createdAt&limit=20`
- `PATCH {apiRoute}/notifications?where[id][in]=<ids>` — body `{ isRead: true }`, sent only when
  the preceding `GET`'s `docs` is non-empty.

All three are read/write against a collection the requesting staff user already has native
`authenticated` access to — no `overrideAccess` involved anywhere in this feature.
