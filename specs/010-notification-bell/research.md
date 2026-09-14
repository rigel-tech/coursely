# Phase 0 Research: Notification Bell

## Decision 1 — The read path: session-scoped service functions, `overrideAccess: true`, collection access untouched

**Decision**: `Notifications.access` stays exactly as it is (staff-only, per
`src/access/authenticated.ts`). Two new service functions in
`src/services/student-notifications.ts` — `countUnreadNotifications(studentId)` and
`listAndMarkRecentNotifications(studentId)` — take an already-resolved student id and
query with `overrideAccess: true`, scoped by `where: { student: { equals: studentId } }`.
The caller (a route or action, see Decision 2) resolves `studentId` via
`getSessionStudent()` first; the service functions never resolve a session themselves.

**Rationale**: this is the same shape every prior feature in this session already used —
`findCourseSlug`, `updateStudentProfile`, `guardAgainstDuplicateEnrollment` all take a caller-
resolved id and use `overrideAccess: true` scoped by an explicit `where`. Loosening
`Notifications.access` to admit any authenticated principal was explicitly ruled out
during specification: `authenticated` means "staff" in this codebase, and widening it to
"any signed-in student" would let student A read student B's notifications through the
collection's own REST/GraphQL/admin surface — a real privacy hole, not a hypothetical one.

**Alternatives considered**:

- _Add a student-scoped `read` access function to the collection itself_
  (`({ req }) => req.user?.collection === 'students' ? { student: { equals: req.user.id } } : false`,
  merged with the existing staff check). Rejected: still routes traffic through Payload's
  REST/GraphQL endpoints for students, which this app's students have never used (they go
  through the Local API via actions/services only, like every other student-facing read in
  this codebase) — a wider surface for no benefit, and a second, subtler place the
  staff-only assumption could be undone by a future edit.

## Decision 2 — Two entry points, split by whether they write

**Decision**: `GET /next/notifications-count` (a new route, `src/app/(frontend)/next/
notifications-count/route.ts`) returns `{ count: number }` and does nothing else — the
5-second poll target. Opening the list calls a new Server Action,
`listNotificationsAction()` (`src/actions/student/notifications.ts`), because it also
marks the returned batch read (a write).

**Rationale**: matches a split already established in this codebase, just not previously
named as a rule: `/next/auth-status` and now `/next/notifications-count` are pure reads
serving `HeaderAuthControls` on `force-static` pages; every action that writes
(`createEnrollmentAction`, `updateProfileAction`, `loginAction`, …) is a Server Action.
Folding the count into a route keeps the 5-second poll cheap and side-effect-free, which
matters more for it than for the list (fetched once per click, not once per minute).

**Alternatives considered**:

- _One combined route/action for both count and list._ Rejected — would make the
  5-second poll also mark notifications read on every tick, silently satisfying FR-005 far
  more often than "the student opened the list", or would need a flag threaded through a
  GET route to opt out of the write, both worse than just having two entry points.

## Decision 3 — Marking read is scoped to exactly the fetched batch, not "all unread"

**Decision**: `listAndMarkRecentNotifications` fetches the most recent 20 (`sort:
'-createdAt', limit: 20`), then updates only those fetched ids
(`where: { id: { in: ids } }`) to `isRead: true`. It does not do a broader
`where: { isRead: { equals: false } }` update.

**Rationale**: FR-005 says "every notification **currently shown in it**" — if a student
has more than 20 unread notifications, only the 20 shown are marked; the rest stay unread
and the count reflects that on the next poll. A broad "mark all unread" would silently
mark notifications the student never saw, which is both a literal mismatch with FR-005 and
the kind of silent behaviour this codebase's INVARIANTS.md exists to catch before it ships.

## Decision 4 — Notification creation becomes a module, mirroring `src/email/`

**Decision**: New `src/notifications/create.ts`, exporting one `createNotification(payload,
{ studentId, type, title, content, metadata? }, req?)` shared by every notification type,
and `src/notifications/templates/*.ts` (one file per type, each a pure function returning
`{ title, content }`), mirroring `src/email/send.ts` + `src/email/templates/`.
`student-registration.ts`'s inline `ACCOUNT_CREATED` write and `student-enrollment.ts`'s
inline `ENROLLMENT_CREATED` write are refactored onto it — same collection, same data, no
behaviour change to either flow.

**Revised 2026-09-14**: the first version of this decision gave `create.ts` one
`createXxxNotification(payload, studentId, ...)` wrapper per type — effectively a thin
`payload.create` call duplicated once per type, differing only in which fields it read
from `data`. The user asked for this to be one function, reusable wherever a notification
is raised (their words: "cho admin, student" — whoever ends up triggering one, not
necessarily a student-specific caller). `createNotification` now takes `type` as a plain
argument; a caller resolves its own `{ title, content }` from the matching template first,
then calls this one function. Adding a new notification type going forward means a new
template file and a new `type` in the union — no new wrapper function.

**Rationale**: requested explicitly by the user, mid-specification, for the same reason
the email module exists — every future feature that raises a notification reuses one
function instead of re-typing the same `payload.create({ collection: 'notifications',
... })` shape a third time. `req`/transaction threading stays the caller's job (both
existing call sites already run inside their own transaction and pass `req` through), so
`createNotification` takes an optional `req` to pass along, exactly like `payload.sendEmail`
calls need no transaction at all and the email module never had this concern — this
function accepts `req?: Partial<PayloadRequest>` where the email ones do not.

**Alternatives considered**:

- _Leave the two existing call sites as they are, add the module only for future use._
  Rejected — the module raison d'être the user gave is reuse _now_; leaving both existing
  writers hand-rolling the same shape while a shared function exists beside them is the
  drift the module is meant to prevent, not a smaller diff worth preferring.
- _One wrapper function per notification type_ (the original shape). Superseded — see
  "Revised" above; two near-identical wrapper functions was more duplication than one
  function taking `type` as data, for no type-safety loss (`type` is still constrained to
  `Notification['type']`).

## Decision 5 — Client: a dedicated `NotificationBell` component, polling only while authenticated

**Decision**: New `src/components/public/NotificationBell/index.tsx`, rendered by
`HeaderAuthControls` only in the already-authenticated branch (replacing today's
decorative `<button>`). It owns: a `setInterval`-driven poll of
`/next/notifications-count` every 5 seconds (cleared on unmount), a click handler that
opens a popover and calls `listNotificationsAction()`, and a click-outside handler that
closes it.

**Rationale**: keeps `HeaderAuthControls` from growing a second unrelated concern inline —
same reasoning that already split `CourseRegistrationForm` out of
`CourseRegistrationCTA`. Polling starts only once `HeaderAuthControls` has confirmed
`authenticated === true` (its existing `/next/auth-status` call), so a signed-out visitor
never polls at all (FR-001).

**Known ripple**: `tests/unit/components/header-auth-controls.spec.ts`'s last test
("calls the status endpoint exactly once") asserted a single `fetch` call for the
authenticated case; it will now also see the count poll's fetch, and needs updating.
