# Phase 1 Data Model: Notification Bell

No new entity, no new field, no schema/migration change. This feature adds two read
operations and reuses the existing `isRead` field's write path.

## Notification (existing — unchanged fields)

| Field       | Type                      | Notes                                                                                                                 |
| ----------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `student`   | relationship → `students` | required — the scoping key for every query this feature adds                                                          |
| `type`      | select                    | `ACCOUNT_CREATED` \| `ENROLLMENT_CREATED` (unchanged; a future type is just another entry, another template)          |
| `title`     | text                      | shown as the list entry's heading                                                                                     |
| `content`   | textarea                  | shown as the list entry's body                                                                                        |
| `isRead`    | checkbox, indexed         | flipped `false → true` by `listAndMarkRecentNotifications`, scoped to the fetched batch only (research.md Decision 3) |
| `createdAt` | timestamp                 | sort key (`-createdAt`) and what "most recent" means                                                                  |

## New read shapes

```ts
// GET /next/notifications-count
type NotificationsCountResponse = { count: number }

// listNotificationsAction() result — reuses the existing generated Notification type
type NotificationListItem = Pick<Notification, 'id' | 'type' | 'title' | 'content' | 'createdAt'>
```

No new Zod schema: neither entry point takes student input beyond an implicit session —
there is nothing for a visitor to submit that needs validating.

## New module surface (no data model of its own — pure functions)

- `src/notifications/create.ts`: one `createNotification(payload, { studentId, type,
title, content, metadata? }, req?)` — a thin wrapper over `payload.create`, shared by
  every notification type rather than one wrapper function per type (revised 2026-09-14,
  at the user's request — see `research.md` Decision 4). A caller gets `title`/`content`
  from a template first, then calls this one function.
- `src/notifications/templates/*.ts`: pure functions returning `{ title, content }` for
  each type — no Payload import, exactly like `src/email/templates/`.
