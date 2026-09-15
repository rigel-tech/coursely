# Phase 0 Research: Admin Notification Bell

## Decision 1 — The admin bell talks to Payload's own REST API directly, not a new Next.js route or Server Action

**Decision**: The admin bell component (`'use client'`, under `src/components/admin/`) fetches its
count and list, and marks rows read, by calling Payload's own generated REST endpoints for the
`notifications` collection — `GET {apiRoute}/notifications/count`, `GET {apiRoute}/notifications`,
`PATCH {apiRoute}/notifications` — using `@payloadcms/ui`'s `requests` helper
(`utilities/api.js`, confirmed present: `requests.get`/`requests.patch`, both
`credentials: 'include'`) and `formatAdminURL`/`useConfig()` to build the URL
(`config.routes.api`), matching the pattern already used internally by
`@payloadcms/ui`'s own components (e.g. `FolderView/Cell/index.client.tsx`,
`DefaultListViewTabs`). No new file under `src/actions/` or `src/app/**/next/*` is added.

**Rationale**: specs/010's routes-vs-actions split (research.md Decision 2 there) exists because
the _public_ site is `force-static` and has no session on the server for a plain GET, so a public
page needs a dedicated `/next/*` route to read session-scoped data, and a write needs a Server
Action. Neither constraint applies to `/admin`: it is Payload's own client-rendered React app,
already authenticated, and already calling its own REST API for everything else it does. Staff
also already pass `Notifications.access`'s `authenticated` check natively (`user.collection ===
'users'`) — there is no student-style access hole to route around with `overrideAccess`, so no
server-side reader function is needed either. Reusing Payload's existing REST surface is strictly
less code than adding a parallel one.

**Alternatives considered**:

- A new `/next/admin-notifications-count` route + a Server Action for list/mark-read, mirroring
  specs/010 exactly. Rejected: it would duplicate REST endpoints Payload already exposes for this
  exact collection, for no behavioural gain — the admin panel has no static-rendering constraint
  forcing that split.
- A Local-API-backed RSC data fetch inside a Payload admin "before/afterNav" server component.
  Rejected: `admin.components.actions` renders on every admin screen via the client-side app
  shell, not as a server component boundary Payload documents for this slot; polling for live
  count updates also needs a client component regardless.

## Decision 2 — Cheap unread count: Payload's own `GET /:collection/count` endpoint, not `find` with `limit: 0`

**Decision**: Fetch the count via `GET {apiRoute}/notifications/count?where[student][exists]=false&where[isRead][equals]=false`.

**Rationale**: confirmed by reading the installed Payload 3.88 source
(`payload/dist/collections/operations/find.js`): `usePagination = pagination && limit !== 0`, i.e.
`limit: 0` on `find` **disables** pagination and returns every matching row — not a cheap
count. Separately confirmed `payload/dist/collections/endpoints/index.js` registers
`{ method: 'get', path: '/count', handler: countHandler }` as one of `defaultCollectionEndpoints`
for every collection, and `countHandler` (`payload/dist/collections/endpoints/count.js`) calls
`countOperation`, which runs the collection's own `access.read` (unless `overrideAccess`) and
returns `{ totalDocs }` from `payload.db.count(...)` — a real `SELECT count(*)`, not a full
`find`. This is the REST equivalent of the Local API's `payload.count()`, and it is reachable from
a client component precisely because staff already pass `Notifications.access.read`.

**Alternatives considered**:

- `GET /notifications?limit=0&...` for an unread count. Rejected — invalidated by the `find.js`
  reading above; it would fetch every unread staff notification's full document just to read
  `docs.length`.
- A dedicated Payload custom `endpoint` on the collection returning just a count. Rejected — the
  built-in `/count` endpoint already does exactly this; a custom one would duplicate it.

## Decision 3 — List + mark-read: fetch the batch, then `PATCH` exactly that batch — never "mark all unread"

**Decision**: On click, `GET {apiRoute}/notifications?sort=-createdAt&limit=20` fetches the 20
most recent notifications **across the whole collection** — staff-facing and student-facing
alike, so staff can see everything happening, not just their own broadcast items — filtered
client-side to the rows with no `student` for the mark-read step. A follow-up
`PATCH {apiRoute}/notifications?where[isRead][equals]=false&where[id][in]=<ids>` with body
`{ isRead: true }` marks exactly that staff-only, still-unread subset read. An empty
staff-only subset makes no `PATCH` call at all.

> **Amended 2026-09-15**: this decision originally specified a server-side
> `where[student][exists]=false` on the list `GET` itself (mirroring Decision 2's count
> query). That was dropped during implementation (commit `dd79dc4`) and never restored —
> `NotificationBell` filters client-side after fetching instead, confirmed by
> `tests/unit/components/admin/notification-bell.spec.tsx`'s "fetches the whole collection's
> list, not just staff-only rows". Recorded here rather than left silently wrong; the
> `PATCH`'s own `isRead[equals]=false` condition is new in the same amendment (fixed
> alongside PR #47 review item 2.6 — see `INVARIANTS.md` if this pattern recurs).

**Rationale**: this is the same shape specs/010 already validated and tested for the student side
(`listAndMarkRecentNotifications` in `src/services/student-notifications.ts`, and
`tests/unit/services/student-notifications.spec.ts`'s three behavioural assertions: scoped query,
"marks exactly the returned batch", "does not write at all when there is nothing to mark") — no
reason to invent a different shape for staff. The only change is the `where` clause's scoping
condition: `student: { exists: false }` (staff-facing) instead of `student: { equals: studentId }`
(this one student's own). Payload's REST `PATCH /:collection` (no `/:id`) is the bulk-update
endpoint — confirmed registered alongside `/count` in `defaultCollectionEndpoints`
(`{ method: 'patch', path: '/', handler: updateHandler }`) — the REST counterpart of the Local
API's scoped `payload.update({ where, data })` bulk form already used by
`listAndMarkRecentNotifications`.

**Alternatives considered**: none — this is a direct precedent carry-over, not an open design
question.

## Decision 4 — `Notification.student` becomes optional; a notification with no `student` is staff-facing

**Decision**: `src/collections/Notifications/index.ts`'s `student` field drops `required: true`
(becomes optional). No new field is added to distinguish "staff-facing" — its absence _is_ the
signal (Q1/Q2 in spec.md). The field's module banner comment is rewritten in the same commit
(constitution's invariant-maintenance rule): the current text asserts "the field is `student`, not
`user` … Staff never receive them", which this feature makes false.

A hand-written Postgres migration follows, mirroring the exact shape of
`20260912_000000_drop_students_is_walk_in.ts` (drop/restore a constraint, not a column):

```ts
// up
await db.execute(sql`ALTER TABLE "notifications" ALTER COLUMN "student_id" DROP NOT NULL;`)
// down
await db.execute(sql`ALTER TABLE "notifications" ALTER COLUMN "student_id" SET NOT NULL;`)
```

registered in `src/migrations/index.ts` exactly like every prior migration there.

**Rationale**: matches the migration-duality precedent from specs/008 (drizzle-kit `push` for
dev/`tests/int`, hand-written migration for `prodMigrations`) — the Payload field config change
drives the former, this migration drives the latter. `down` restoring `SET NOT NULL` is only
safe if no staff-facing (null-`student`) row exists at rollback time; this matches this repo's
existing rollback style (`is_walk_in`'s `down` also does not attempt to recover lost data), so no
new precedent is being set.

**Alternatives considered**:

- A new boolean `audience` field (`STUDENT` | `STAFF`) instead of overloading `student`'s
  presence. Rejected by the resolved spec (Q1/Q2) — "no `student` set is staff-facing" is the
  answer already settled with the user; introducing a second field to say the same thing is
  needless.

## Decision 5 — `createNotification`'s `studentId` becomes optional; `ACCOUNT_CREATED`'s call site drops it

**Decision**: `CreateNotificationInput.studentId: number` becomes `studentId?: number` in
`src/notifications/create.ts`. The `data` object is built so `student` is included only when
`input.studentId` is present:

```ts
data: {
  ...(input.studentId !== undefined ? { student: input.studentId } : {}),
  type: input.type,
  title: input.title,
  content: input.content,
  metadata: input.metadata,
  isRead: false,
},
```

`src/services/student-registration.ts`'s `createStudentWithWelcomeNotification` drops
`studentId: student.id` from its `createNotification(...)` call for `ACCOUNT_CREATED`, making it
a broadcast/staff-facing write per Q2.

**Rationale**: a plain conditional spread is the least code that produces "no `student` key at
all" rather than `student: undefined`, which Payload's create operation may not treat identically
to an absent key. `student-notifications.ts`'s existing `where: { student: { equals: studentId }
}` queries already exclude any row with no `student` by construction (`equals: <id>` can never
match null/absent) — confirmed no change needed there, satisfying FR-003 "never on a student's own
bell" for free.

**Alternatives considered**: an `input.studentId ?? undefined` assignment. Rejected — Payload's
Local API create still receives an explicit `student: undefined` key, which is worth avoiding
for the same "don't guess how the ORM treats an explicit-undefined key" reason a conditional
spread sidesteps outright.

## Decision 6 — Accepted test ripple: `tests/int/register-action.spec.ts`

**Decision**: the existing integration assertion that `ACCOUNT_CREATED`'s stored row has
`student: <the new student's id>` is updated to assert `student` is absent/null instead, per the
spec's own "Accepted ripple" note. This is a required test update, not a suggested one — the
current assertion will fail once Decision 5 ships, for exactly the reason the spec says it should.

**Rationale**: already resolved and written down in spec.md's Clarifications section before this
plan started; recorded here only so `/speckit-tasks` picks it up as a concrete task rather than a
loose end.

## Decision 7 — Component placement and import-map step

**Decision**: new file `src/components/admin/NotificationBell/index.tsx` (client component,
`@payloadcms/ui` only, no design tokens per the constitution's admin/public split), registered at
`admin.components.actions: ['@/components/admin/NotificationBell#NotificationBell']` in
`payload.config.ts`. `pnpm generate:importmap` is run once the component exists, regenerating
`src/app/(payload)/admin/importMap.js` (a standing drift file already excluded from this
project's own commits per prior features).

**Rationale**: this is the exact confirmed shape of `admin.components.actions` and this project's
established convention for referencing admin components by string path (constitution: "Admin
components referenced by string path require `pnpm generate:importmap`" — already an
INVARIANTS.md entry).

**Alternatives considered**: none — this is Payload's only documented slot for "top right of the
admin header" (FR-001), already confirmed against the installed type definitions before spec.md
was written.

## Polling interval

5 seconds, matching specs/010's public bell (`POLL_INTERVAL_MS = 5_000`) after that feature's own
correction — no reason for the two bells to disagree on cadence.
