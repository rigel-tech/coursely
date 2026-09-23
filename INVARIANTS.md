# Standing invariants

Constraints in this repo that **break silently**: violate one and the code still compiles,
still passes review, still renders a 200. Only the data or the output is wrong. No linter,
type checker, or test catches these — which is why they get re-broken by whoever touches the
code next.

## What gets in

An entry must satisfy **all three**:

1. **Breaks silently.** Violating it does not throw, does not fail a build, does not turn a
   test red. If a guard already catches it, it does not belong here — noise makes the file
   go unread.
2. **Forward-facing.** It constrains code that has not been written yet, anywhere in the
   repo — not just the spot where it was discovered. Feature-local detail does not qualify.
3. **Currently true.** It describes how the code behaves _now_.

House style, naming conventions, and commit process are **not** invariants. Those live in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## This is not a changelog

Only current law is recorded here. When a change makes an entry obsolete, **rewrite or delete
it in that same commit**. Never leave the old rule beside the new one, and never keep a
"previously this was…" note for comparison — git has the history.

> A stale invariant is worse than a missing one, because it will still be believed.

Line numbers drift. Treat every `file:line` as a starting point and trust the **symbol name**
it names.

---

## Access control and data exposure

### Front-end reads of `pages` and `posts` must pass `overrideAccess: false` (or `overrideAccess: draft`)

**Rule** — Every `payload.find` / `payload.findByID` that renders content to a public visitor
must pass `overrideAccess: false`. On a route that supports draft preview, pass
`overrideAccess: draft` so an authenticated previewer still sees drafts and nobody else does.

**Why it breaks silently** — Payload's Local API defaults `overrideAccess` to **`true`**, i.e.
skip access control. `authenticatedOrPublished` is the _only_ thing that adds
`_status: { equals: 'published' }` to the query, so omitting the flag does not error — it
quietly widens the result set. The page renders 200, the layout is correct, the markup is
valid; it just contains posts nobody published yet. Nothing in the response says so.

**Where** — `src/access/authenticatedOrPublished.ts:3` (`authenticatedOrPublished`, the
`_status` filter at :8). Every call site currently conforms:
`src/app/(frontend)/[slug]/page.tsx:22` and `:104` (`queryPageBySlug`),
`src/app/(frontend)/posts/[slug]/page.tsx:24` and `:98` (`queryPostBySlug`),
`src/app/(frontend)/posts/page.tsx:21`,
`src/app/(frontend)/posts/page/[pageNumber]/page.tsx:33` and `:76`,
`src/blocks/ArchiveBlock/Component.tsx:33` (`ArchiveBlock`), both sitemap routes at `:16`.

### The front end reads `post.populatedAuthors`, never `post.authors`

**Rule** — Render bylines from `populatedAuthors`. Do not read `post.authors` in any front-end
component, and do not "simplify" it to `authors` with a depth bump. `users.fullName` is part
of this rule, not a profile field that happens to sit there: it must not be renamed **or
removed**, however staff-only `users` becomes.

**Why it breaks silently** — `users` has `read: authenticated`, so for an anonymous request
Payload's relationship population is filtered by access control and `authors` comes back as
bare IDs rather than user objects. It does not throw and it does not return an error field —
`author.name` is simply `undefined`, so the byline renders as an empty string and the page
looks like a post that has no author. The `populateAuthors` afterRead hook exists precisely to
copy `{ id, name }` past that boundary — its `name` is read from the user's `fullName` field,
so renaming that field silently blanks every byline. GraphQL also refuses to return mutated
user data that differs from the schema, which is why the copy lives in its own field instead.

The removal case is the live one. `users` shed every student field when students moved to
their own collection, and `fullName` reads like one more of them — it is the single field
left on a collection that is otherwise pure auth. `Posts.authors` still points at `users`,
so the byline still comes from here; delete the field and the site renders authorless posts
with a green build and a green test suite.

**Where** — `src/collections/Users/index.ts` (`read: authenticated` in `access`; the
`fullName` field the byline is copied from, pinned by
`tests/unit/collections/users-notifications-config.spec.ts`),
`src/collections/Posts/hooks/populateAuthors.ts`
(`populateAuthors`, `name: authorDoc.fullName`, and the comment explaining the boundary),
`src/collections/Posts/index.ts:197` (`populatedAuthors` field, `admin.disabled`), consumed at
`src/heros/PostHero/index.tsx:12` (`PostHero`).

**Where** — `src/collections/Students/index.ts` (`access.admin`), pinned by
`tests/unit/collections/students-config.spec.ts`. The override itself is
`node_modules/payload/dist/utilities/canAccessAdmin.js` (`canAccessAdmin`, the `else if` after
`adminAccessFn`); `src/payload.config.ts` (`admin.user`) is what it overrides.

### An access predicate for a staff-only collection must check `user.collection`, not `Boolean(user)`

**Rule** — Any `access` function guarding a collection that only staff may touch tests
`user?.collection === 'users'`. Never gate it on `Boolean(user)` alone. `authenticated`
(`src/access/authenticated.ts`) already does this and is the predicate to reach for; a new one
copies that check, never the truthiness shortcut.

**Why it breaks silently** — every Payload auth collection has its own `POST /api/{slug}/login`
that signs a `payload-token`, and `proxy`'s matcher lists only guarded page prefixes, so
`proxy` never sees those requests. Once a second auth collection exists (`students`), a signed-in student holds a
valid `payload-token`. A `Boolean(user)` predicate cannot tell it apart from a staff token, so
it grants the student every collection it guards over REST — reading the whole `users` table,
minting staff accounts, resetting an admin password. Nothing throws, the build and tests stay
green, and `Students.access.admin: () => false` does not help because that only gates the
`/admin` UI, not the REST API. The `AccessArgs<User>` type actively hides it: it says the
principal is a `User`, but at runtime it is whichever collection signed the token.

**Where** — `src/access/authenticated.ts` (the `user?.collection === 'users'` check), used by
every admin-content collection (`Users`, `Students`, `Media`, `Posts`, `Pages`, `Categories`,
`Courses`, `CoursePhases`, `CourseObjectives`, `Classes`, `Notifications`). Pinned by
`tests/unit/access/authenticated.spec.ts` and `tests/int/rest-access-isolation.spec.ts`.
`src/access/authenticatedOrPublished.ts` has the same `Boolean(user)` shape for `pages`/`posts`
reads and leaks drafts to a student token — narrower (no PII), still open, not yet fixed.

### A student reads their own notifications only through `student-notifications.ts` — never by widening `Notifications.access`

**Rule** — `Notifications.access` stays `authenticated` (staff-only, per the entry above) —
that does not change to let a student in. A student's own notification count and list are
read by `src/services/student-notifications.ts`'s `countUnreadNotifications(studentId)` /
`listAndMarkRecentNotifications(studentId)`, each an `overrideAccess: true` Local API call
explicitly scoped by `where: { student: { equals: studentId } }`, with `studentId` resolved
by the caller from `getSessionStudent()` — never taken from the request. If a student
needs a new way to read their own notifications, add a scoped function here; do not add a
student-admitting branch to the collection's own `access`.

**Why it breaks silently** — the obvious-looking fix for "students can't read their own
notifications" is to loosen `Notifications.access.read` to admit any authenticated
principal, or to add a `req.user?.collection === 'students'` branch that returns
`{ student: { equals: req.user.id } }`. Either compiles, passes a quick manual check (the
signed-in student who tested it only ever queries their own id), and ships — but it opens
the collection's REST/GraphQL/admin-adjacent surface to every student token, and a student
who edits their own query (or calls the API directly) can ask for `student: { equals:
<anyone else's id> }` and read it. Nothing in the collection config stops them once
`access` itself admits students; the only thing that was ever stopping this was
`authenticated`'s staff-only check, and that is exactly what got widened.

**Where** — `src/services/student-notifications.ts`, called from
`src/app/(frontend)/next/notifications-count/route.ts` and
`src/actions/student/notifications.ts`. `src/collections/Notifications/index.ts`'s
`access` block is the thing this entry says never to touch for this purpose.

### The admin notification bell must never mark a student's own notification as read

**Rule** — `src/components/admin/NotificationBell`'s `loadList` fetches the whole
`notifications` collection (staff-facing and student-facing rows alike), but its
mark-as-read `PATCH` must only ever target rows with no `student` — filter to that subset
(`staffDocs` in the current code) before building the `where[id][in][...]` query. Never
`PATCH` the full fetched batch.

**Why it breaks silently** — a student's own unread count
(`countUnreadNotifications`/`listAndMarkRecentNotifications` in
`src/services/student-notifications.ts`) trusts `isRead` as the only signal that the
student has seen a notification. Batch-PATCHing every row the admin bell fetches compiles,
passes lint, and looks like a harmless simplification — the admin panel renders fine and
the badge clears as expected. But it silently flips `isRead` on a student's own
`ENROLLMENT_CREATED`/etc. notification the moment a staff member merely opens their own
bell, and that notification then vanishes from the student's unread count without the
student ever having opened it. Nothing throws, nothing logs.

**Where** — `src/components/admin/NotificationBell/index.tsx` (`loadList`, the `staffDocs`
filter), pinned by `tests/unit/components/admin/notification-bell.spec.tsx` § "marks only
the rows without a student as read". `src/services/student-notifications.ts` is the reader
this protects.

### `notifications.user` scopes nothing — it is a bare FK, not a per-user notification channel

**Rule** — Setting `notifications.user` on a row does not restrict who can read it, does not
exclude it from the staff broadcast list, and does not make that notification private to
that one staff member. `Notifications.access` stays `authenticated` (staff-only, broadcast
to every signed-in staff member) regardless of whether `user` is set. Building "this
notification belongs to this one staff member" — a per-staff inbox, a "mine" filter, a read
receipt scoped to them — needs the same treatment `student-notifications.ts` gives
`student`: an explicit, separately-scoped query, and a corresponding change to what the
admin bell treats as broadcast vs personal. Neither exists yet; today `user` is only a
reference.

**Why it breaks silently** — the field reads exactly like `student`, which _does_ gate a
student's own list (`student-notifications.ts`'s `where: { student: { equals: studentId }
}`). Setting `user` on a notification meant to be private to one staff member compiles,
saves, and looks right in the admin UI — every staff member still sees it in the shared
bell (`NotificationBell`'s `loadList` fetches the whole collection with no `user` filter),
and nothing errors to say the "privacy" never happened.

**Where** — `src/collections/Notifications/index.ts` (`user` field, the module banner
stating it plays no part in audience determination), `src/components/admin/NotificationBell/index.tsx`
(`loadList`, fetches every row regardless of `user`), `src/access/authenticated.ts`
(`Notifications.access`, unchanged).

### `getStudentEnrollments` must query at `depth: 1` with `select`/`populate`/`joins: false` and sanitize into `StudentEnrollmentItem`

**Rule** — `getStudentEnrollments` queries with `depth: 1`, `select` (6 enrollment fields),
`populate` (course: 3 fields, class: 6 fields), and `joins: false`. Its mapper strips classes
whose `status` is not in `VISIBLE_CLASS_STATUSES` and emits only `AssignedClassSummary`'s 5
public fields. Callers must never widen `depth`, remove `select`/`populate`, or serialize a raw
`Class` document to the student's browser.

**Why it breaks silently** — At `depth: 0` Payload returns bare foreign-key numbers instead of
objects; `typeof doc.class === 'object'` is `false`, so every enrollment renders "Chưa xếp lớp"
even when a class is assigned. Removing `select`/`populate` exposes internal fields
(`maxStudents`, timestamps) of an `authenticated`-only collection in the RSC payload. Neither
throws, neither fails a build — the page renders a 200 with the wrong data.

**Where** — `src/services/student-enrollment.ts` (`getStudentEnrollments`, `VISIBLE_CLASS_STATUSES`,
`StudentEnrollmentItem`, `AssignedClassSummary`), consumed by
`src/components/public/profile/StudentAccount.tsx` (`StudentAccountProps`).

## Cache invalidation

### Every `revalidateTag(X)` must match an `unstable_cache` tag `X` character for character

**Rule** — A cache tag is a bare string shared across two files. When you add, rename, or
template a tag, change the producer and the consumer together. Tags currently in use:
`pages-sitemap`, `posts-sitemap`, `global_header`, `global_footer`, `redirects`.

**Why it breaks silently** — `revalidateTag` on a tag no cache entry carries is a **no-op**. It
does not throw and it does not warn. The hook still runs to completion and still logs its
success line (`Revalidating header`), the admin still shows the document as saved, and the
editor has every reason to believe the change went live. The site then serves the stale cached
copy indefinitely.

**Where** — Producers: `src/collections/Pages/hooks/revalidatePage.ts:19` (`revalidatePage`),
`src/collections/Posts/hooks/revalidatePost.ts:19` (`revalidatePost`),
`src/Header/hooks/revalidateHeader.ts:9` (`revalidateHeader`),
`src/Footer/hooks/revalidateFooter.ts:9` (`revalidateFooter`),
`src/hooks/revalidateRedirects.ts:8` (`revalidateRedirects`). Consumers:
`src/app/(frontend)/(sitemaps)/posts-sitemap.xml/route.ts:47` (`getPostsSitemap`),
`src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts:60` (`getPagesSitemap`),
`src/utilities/getGlobals.ts:25` (`getCachedGlobal`, tag `global_${slug}`),
`src/utilities/getRedirects.ts:25` (`getCachedRedirects`).

> `src/utilities/getDocument.ts:30` (`getCachedDocument`) tags entries `${collection}_${slug}`
> and **nothing revalidates that tag** — the exact failure this rule prevents, already present.

### A page's public URL is `/` when its slug is `home`, and `pages` carry no collection prefix

**Rule** — Anywhere you build a URL for a `pages` document: map slug `home` to `/`, and emit no
`/pages` segment. `posts` do get a `/posts` prefix. This rule is duplicated in six places;
adding a seventh means getting it right there too.

**Why it breaks silently** — In the revalidation direction there is no feedback at all:
`revalidatePath('/home')` succeeds, because Next does not check whether a route serves that
path. The hook logs `Revalidating page at path: /home`, the editor sees a successful save, and
`/` keeps serving the old homepage forever. In the link direction it degrades to a 404 —
visible, but only to whoever clicks it.

**Where** — `src/collections/Pages/hooks/revalidatePage.ts:14` (`revalidatePage`, also :24 and
:37), `src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts:50`,
`src/app/(frontend)/[slug]/page.tsx:48` (the `slug = 'home'` default),
`src/utilities/generatePreviewPath.ts:4` (`collectionPrefixMap`, `pages: ''`),
`src/components/public/Link/index.tsx:38` (`CMSLink`),
`src/components/public/PayloadRedirects/index.tsx:31` (`PayloadRedirects`, also :35).

### `revalidatePath` on a rewritten page takes the folder path, never the public one

**Rule** — Next caches a rewritten page under its route's own path, the destination on the
right of `rewrites.ts`. So `/khoa-hoc/:slug` is revalidated as `revalidatePath('/courses/<slug>')`.
Every course revalidation goes through `coursePath` in `revalidateCourse.ts`. The course page
also renders its `course-objectives` and `course-phases`, so saving or deleting one of those
revalidates the page of the course it belongs to — both courses, when it moves. The home page
`/` lists published courses and is prerendered, so every course change that reaches the public
site — publish, unpublish, re-slug, delete — revalidates `/` as well; objectives and phases do
not, since the home page shows neither. A new page that lists courses needs the same.

A Local API write to any of those three collections from outside a Next request — a seed, a
script, an int test — passes `context: { disableRevalidate: true }`. Outside Next,
`revalidatePath` throws `Invariant: static generation store missing`, and the throw rolls the
write back.

**Why it breaks silently** — `revalidatePath('/khoa-hoc/<slug>')` returns normally and warns
about nothing; the editor sees a successful save, and the cached page keeps serving the old
content until the next build. `next dev` never caches, so it cannot show up locally. The
out-of-Next throw is loud on its own, but test cleanup is written as
`payload.delete(…).catch(() => {})`: the delete is rolled back, the catch swallows why, the
test stays green, and the row stays in the database. The first run of these hooks left ten
courses behind exactly that way.

**Where** — `src/collections/Courses/hooks/revalidateCourse.ts` (`coursePath`), wired in
`Courses`, `CourseObjectives` and `CoursePhases`. Source: Next 16.3.0
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`
§ "Using `revalidatePath` with rewrites". Pinned by
`tests/unit/collections/revalidate-course.spec.ts` § "never the public rewrite source", and
`tests/int/revalidate-course.spec.ts` for the wiring on `Courses`. Out-of-Next writers today:
`src/seed/seedCourses.ts`, `src/seed/seedCourseDetails.ts`, and the course cleanup in
`tests/int/`.

> `src/actions/student/profile.ts:111` revalidates `/tai-khoan`, the public name, written
> under the rule this entry replaces. Left for its own change, not swept here.

## Config-to-component wiring

### A new `blockType` must be registered in `blockComponents`

**Rule** — Adding a block to a collection's `blocks` field is half the job. Register its `slug`
in the `blockComponents` map in the same commit.

**Why it breaks silently** — The lookup is guarded by `blockType in blockComponents`, and
TypeScript narrows `blockType` through the `in` operator, so an unregistered block produces
**no type error**. At runtime the guard fails and the branch falls through to `return null`.
The block appears in the admin UI, the editor fills it in, the document saves, and the front
end renders nothing where it should be. There is no console warning and no failed render.

**Where** — `src/blocks/RenderBlocks.tsx:11` (`blockComponents`), the `in` guard at :32, the
silent `return null` at :44.

### Admin components referenced by string path require `pnpm generate:importmap`

**Rule** — Payload config references admin components as strings
(`'@/components/admin/RowLabel/Header#RowLabel'`). After adding, moving, or renaming one, run
`pnpm generate:importmap` and commit the regenerated `importMap.js`.

**Why it breaks silently** — The reference is a **string literal**, so TypeScript never
resolves it and never complains. `importMap.js` is the only thing that turns it into a real
import. Without an entry, Payload falls back to its default rendering for that slot: the row
label shows a generic index instead of the nav item's own label, the dashboard renders without
the custom panel. The admin panel loads fine and the build succeeds.

**Where** — `src/Header/config.ts:24` and `src/Footer/config.ts:24` (the string paths),
resolved by `src/app/(payload)/admin/importMap.js:57` (`importMap`, generated), wired at
`src/payload.config.ts:31` (`admin.importMap.baseDir`).

### Any field `CardPostData` reads must be listed in `Posts.defaultPopulate`

**Rule** — `CardPostData` and `Posts.defaultPopulate` describe the same set of fields. Widen
`CardPostData` (or read a new field inside `Card`) only together with `defaultPopulate`.

**Why it breaks silently** — `CardPostData` is `Pick<Post, …>`, so TypeScript asserts every
picked field is present. But when a post arrives through a _relationship_ — `relatedPosts`, or
an archive block's `selectedDocs` — Payload populates only what `defaultPopulate` selects. The
extra field is `undefined` at runtime while the type says otherwise. `Card` guards most values
with `&&`, so it renders a card that is simply missing its image, or its category line, with
no error anywhere.

**Where** — `src/components/public/Card/index.tsx:11` (`CardPostData`),
`src/collections/Posts/index.ts:41` (`defaultPopulate`). Relationship-fed consumers:
`src/blocks/RelatedPosts/Component.tsx:27` (`RelatedPosts`),
`src/components/public/CollectionArchive/index.tsx:21` (`CollectionArchive`).

### The admin list view always reads relationship fields at `depth: 0`

**Rule** — A custom list-view `Cell` for a `relationship` field cannot assume `cellData` is
the populated document. Every other read path in this project (Local API default, REST
default) populates at `depth: 2`, but `@payloadcms/next`'s List view hard-codes `depth: 0` for
its own `find` call — not something a collection config can override. Write the `Cell` to
handle a bare numeric id itself — an `afterRead` collection hook that mutates the field into
an object looks like a fix but corrupts every other read path instead (see below), so it is
not an option.

**Why it breaks silently** — `DefaultCellComponentProps['cellData']` is typed loosely enough
that reading `cellData.email` compiles fine even though at runtime, in the list view only,
`cellData` is a plain number. No error, no warning — the column just renders whatever the
`Cell`'s number/undefined branch does (commonly a raw id, or nothing), while the exact same
`Cell` shows the right name/email everywhere else (the edit view, `findByID` at default
depth) because those paths really do populate.

**Where** — `node_modules/@payloadcms/next/dist/views/List/index.js` (`depth: 0` in the list's
`req.payload.find` call — not project code, so it cannot be patched, only worked around).
Fixed for this collection by making `src/collections/Payments/components/StudentCell.tsx` and
`RecorderCell.tsx` **server** components (no `use client`): given a bare number they call
`payload.findByID` themselves, given an already-populated object they render it directly.
`enrollmentId`'s `EnrollmentCell.tsx` needs no such fetch — it only ever displays the id,
populated or not. An earlier version of this fix used an `afterRead` hook
(`populatePaymentRelations`, mirroring `src/collections/Posts/hooks/populateAuthors.ts`) that
mutated `studentId`/`userId`/`enrollmentId` in place; that changed the shape of _every_ read
(REST, Local API, GraphQL) regardless of requested `depth`, and broke GraphQL outright — its
relationship resolver reads the field's raw value as an id (`parseFloat`), so a pre-populated
object resolved to `NaN` and the field came back `null`. Resolving only inside the two `Cell`s
that need it keeps every other read path returning exactly what its own `depth` asked for.

## Server actions

### An auth server action that sets a cookie must not `redirect()` — it returns `redirectTo`

**Rule** — When a server action writes an auth cookie (`pending_email`, `coursely-access`,
`coursely-refresh`), it must **not** call `redirect()` in the same pass. It returns
`{ status: 'success', redirectTo }` (or an error `code` alongside `redirectTo`), and the
client form navigates from an effect once the new state arrives — `router.push` for a
same-tree route, `window.location.assign` when the destination must re-read the cookie
server-side. A logout action clears the cookies and returns `redirectTo` the same way.

**Why it breaks silently** — `cookies().set()` followed by `redirect()` inside a `useActionState`
action is a known-fragile Next combination: the redirect can be handled by the client router
before the `Set-Cookie` from the action response is applied, so the destination loads without
the cookie. Nothing errors — the action's DB writes all commit, the return value looks right —
but `/verify-otp` finds no `pending_email` and bounces to `/`, or `/admin` sees no session.
There is no console warning.

**Where** — `src/actions/student/register.ts`, `src/actions/student/login.ts`,
`src/actions/student/verify-otp.ts` (sets `coursely-*` + returns `redirectTo`) and
`src/actions/student/logout.ts` (clears `coursely-*` + returns `redirectTo`) — all return,
never `redirect()`.

Client navigation lives in the form, in one of two shapes. A `react-hook-form` form awaits
the action in its submit handler and navigates on the resolved value:
`src/components/public/forms/RegisterForm.tsx` (`router.push`),
`src/components/public/forms/LoginForm.tsx` and
`src/components/public/LogoutCta/index.tsx` (`window.location.assign`). A `useActionState`
form navigates from a `useEffect` on `state.status` instead:
`src/components/public/forms/OtpForm.tsx`.

Both are safe for the same reason — the browser applies the action response's `Set-Cookie`
before the promise resolves or the new state arrives, so either way the navigation happens
after the cookie exists. What is **not** safe is navigating from inside the action.

### `proxy` must never redirect a Server Action request — it sends `NEXT` and lets the action answer

**Rule** — A Server Action invocation is a POST carrying Next's own `next-action` header, to
the same URL as the page it was called from. `proxy` must treat that header as an
unconditional pass: whatever `decideRoute` would have returned for the pathname, a Server
Action request always gets `NextResponse.next()`, never a redirect.

**Why it breaks silently** — `proxy`'s matcher covers a guarded page and the Server Action
POSTs made from it alike, since both hit the same URL. Before this rule, a stale session hitting a protected
page's action (`/tai-khoan`'s `updateProfileAction`, say) got an HTTP redirect back in place
of the action's own response. The browser followed it exactly as it would for any redirect —
a full navigation to `/dang-nhap`, with no action response ever reaching the calling
component. Nothing throws, no console warning: the person who clicked "Lưu thay đổi" is just
signed out, with no error banner ever rendered, because the component that would have shown
one never got a response to render from. The action's own `ensureSessionStudent()` check — which
already turns "no session" into a proper in-app message — never even ran.

**Where** — `src/proxy.ts` (`isServerAction`, checked before `decideRoute` runs), pinned by
`tests/int/proxy-session.spec.ts` § "a Server Action reaches its own handler even with no
session". Any action reachable from a page under `PROTECTED_PREFIXES`
(`src/lib/constants/auth.ts`) depends on this — today that's
`src/actions/student/profile.ts`'s `updateProfileAction`, called from `/tai-khoan`.

### A refusal must be _returned_, not thrown, or the client's catch-all swallows its message

**Rule** — A server action that wants a specific message to reach the student returns
`{ status: 'error', message }` from an early check or a narrow `try/catch`. It must not let
a refusal escape as a thrown error and rely on the calling component to read `error.message`
— if that component's own `.catch()` is a blanket "show the generic retry text" (the normal,
correct shape for a truly unexpected failure), a thrown refusal with its own carefully
written copy is discarded exactly the same as a real crash.

**Why it breaks silently** — nothing here throws a type error, fails a build, or fails a
test that doesn't specifically assert on the client's rendered message: the server-side
function still returns/throws with the right Vietnamese string attached, `pnpm typecheck`
and a unit test calling the action directly both see a correctly-thrown `Error` with the
correct `.message`, and the client component still renders _some_ text, so nothing looks
broken in a cursory check. Only opening the browser and triggering that specific refusal
shows the generic fallback where the specific message should be. This was live from when
the duplicate-enrollment guard shipped (`specs/007-student-enrollment/research.md`
Decision 3's note flagged it as an accepted, unclosed gap) until it was fixed on
2026-09-15: `validateCourseForEnrollment` threw two distinct, already-written Vietnamese
messages for "registration not open yet" and "registration deadline passed", but
`createEnrollmentAction` only converted `EnrollmentAlreadyExists` to a returned message and
re-threw everything else, so `CourseRegistrationForm`'s
`.catch(() => ({ message: 'Không thể đăng ký khóa học. Vui lòng thử lại.' }))` replaced both
with the generic fallback. The fix was to give each refusal its own `APIError` subclass
(`CourseNotFound`, `RegistrationNotOpen`, `RegistrationClosed` alongside
`EnrollmentAlreadyExists`, all in `src/lib/errors/enrollment.ts`) and map every one of them
in `createEnrollmentAction`'s `try/catch` — the trap is what a _new_ refusal added to this
chain falls back into if it throws a plain `Error` instead of one of these classes.

**Where** — `src/actions/student/create-enrollment.ts` (`createEnrollmentAction`'s
`try/catch`, one `instanceof` branch per class in `src/lib/errors/enrollment.ts`),
`src/services/student-enrollment.ts` (`validateCourseForEnrollment`, throwing the typed
classes instead of a plain `Error`),
`src/components/public/forms/CourseRegistrationForm.tsx` (`onSubmit`'s `.catch()`,
unchanged — it is the reason the action-level fix was necessary, not itself where the fix
lives). The same shape this repo already gets right elsewhere is what the fix copies:
`createEnrollmentAction`'s own `STANDING_REFUSAL` branch and `loginAction`'s `instanceof`
chain against `src/lib/errors/auth.ts`, both _return_ their refusal instead of throwing it.
(`PROFILE_INCOMPLETE_MESSAGE` no longer exists — profile completeness is now enforced by
`createEnrollmentSchema` itself, not a separate branch here.)

## Routing

### A rewritten page has two live paths — link the public one, gate both

**Rule** — `rewrites.ts` gives the pages under `src/app/(frontend)/student/` public
Vietnamese URLs (`/dang-nhap`, `/tai-khoan`, `/xac-thuc-otp`, `/quen-mat-khau`,
`/dat-lai-mat-khau`), and `/courses` the URL `/khoa-hoc`. A rewrite **adds** a name; it
does not retire the folder path, so both reach the app. Two rules follow. Every
`redirect()`, `Link href` and e-mail link uses the **public** path on the left of that
table, never the folder name on the right — `revalidatePath` is the one exception and takes
the folder name, see _"`revalidatePath` on a rewritten page takes the folder path"_. And anything that decides by
pathname must list **both** names, because `proxy` runs before the rewrite and sees whichever
one the browser asked for. Two things do today: `PROTECTED_PREFIXES` and `config.matcher` in
`src/proxy.ts`, which since the matcher was narrowed is what decides whether `proxy` runs for
a path at all.

**Why it breaks silently** — the two paths render the identical page, so every manual
check of the public URL passes while the folder path stays wide open; no request errors,
no log line, and the page still looks guarded. It ran that way here: `/tai-khoan` was
gated and `/student/account` was not, and only the page's own `getSessionStudent()` check
kept it from being a hole. Linking the folder name fails the other way round and just as
quietly — the page loads, so nothing looks wrong, but the URL the user now has bookmarked
is one the guard does not cover and one no redirect will ever send them back to.

**Where** — `rewrites.ts` (the table, and its header states the same rule),
`src/lib/constants/auth.ts` (`PROTECTED_PREFIXES` — each guarded page listed under both
names), `src/lib/auth/route-guard.ts` (`decideRoute` matches on the raw pathname) and
`src/proxy.ts` (`config.matcher`, and it runs before the rewrite).
`tests/unit/repo/protected-prefixes.spec.ts` reads the rewrite table and fails if a guarded
source has an unguarded destination; `tests/unit/repo/proxy-matcher.spec.ts` fails if the
matcher and the prefix lists drift apart.

### A `proxy` matcher source without `/:path*` gates the bare path only — the Next docs say otherwise

**Rule** — Every source in `config.matcher` (`src/proxy.ts`) ends in `/:path*`, and the list
is spelled out as string literals. Never write a bare prefix, and never build the list from
`PROTECTED_PREFIXES` / `AUTH_PREFIXES` however tempting the duplication makes it.

**Why it breaks silently** — Next compiles each source with path-to-regexp and adds no
subpath suffix of its own, so `/tai-khoan` becomes `^/tai-khoan[/#?]?$`: it matches that path and
nothing beneath it. `/tai-khoan/doi-mat-khau` then never reaches the guard at all — the page
renders, `tsc` is clean, and a test that probes only the bare prefix stays green forever.
What makes this the likely mistake rather than a careless one is that the Next documentation
states the opposite: `proxy.md` lists "Are anchored to the start of the path: `/about`
matches `/about` and `/about/team`" among its source-pattern rules. It does not.

The literals half fails harder and just as quietly. Next: "The `matcher` values need to be
constants so they can be statically analyzed at build-time. Dynamic values such as variables
will be ignored." An imported array yields _no_ matcher, so `proxy` runs on nothing and every
guarded page is served to anyone, with no build warning.

**Where** — `src/proxy.ts`, `config.matcher` (its banner repeats this). Checked against Next
16.3.0 by running `tryToParsePath` (`next/dist/lib/try-to-parse-path.js`) directly — the same
function `getMiddlewareMatchers` calls in `next/dist/build/analysis/get-page-static-info.js`.
Pinned by `tests/unit/repo/proxy-matcher.spec.ts`, which compiles the live matcher through
that function and probes bare and subpath forms, plus both sync directions against the two
prefix lists.

## Sessions

### The `coursely-*` cookies carry `students` ids and nothing else

**Rule** — Every `setSessionCookies` call passes claims taken from a `students` document.
No sign-in path may mint a `coursely-access` / `coursely-refresh` pair for a `users` row.
Staff sessions are Payload's own `payload-token` and never enter this scheme.

**Why it breaks silently** — `users` and `students` are separate Postgres tables with
independent `serial` primary keys, so their ids collide: `users.id = 7` and
`students.id = 7` both exist and are different people. The claims carry that number and
nothing else that would tell the tables apart, and `getSessionStudent` looks the id up in
`students` without question. A staff id in that cookie therefore signs a visitor in as
whichever student happens to hold the same number — a real account, a real profile page, a
real name in the header. Nothing throws, nothing logs, and every test that exercises one
account at a time stays green. This is not hypothetical: before the split, `loginAction`
issued the student cookie pair to anyone who authenticated at `/dang-nhap`, admins included.

**Where** — the only two call sites are `src/actions/student/login.ts` (`loginAction`) and
`src/actions/student/verify-otp.ts` (`verifyOtpAction`); both take their user from
`src/services/student-login.ts` / `src/services/student-verification.ts`, which query `students`.
`src/lib/auth/session-cookies.ts` and `src/lib/auth/session-token.ts` (`StudentClaims`) are
what this protects. Pinned by `tests/int/login-action.spec.ts` § "a staff account is not a
principal here".

### Signing and verifying a session token is `async` — every caller must `await`

**Rule** — `signAccessToken`, `signRefreshToken`, `verifyAccessToken` and
`verifyRefreshToken` all return Promises, and so does everything built on them
(`setSessionCookies`, `refreshAccessCookie`, `resolveIdentity`, `proxy`). Await them.
Never interpolate one into a string, and never call one for its side effect alone.

**Why it breaks silently** — a Promise is truthy and stringifies to `"[object Promise]"`,
so the two failure shapes both read as success. Writing one into a cookie signs every
visitor out; checking one as an identity lets every visitor in as a student with an
`undefined` id. TypeScript closes most of this door but not all of it: `Promise<string>`
interpolated into a template literal is a perfectly valid string expression, and a call
whose result is discarded is a floating promise no signature can object to. Both were
real — `tests/int/proxy-session.spec.ts` built its cookie header as
`` `${ACCESS_COOKIE}=${signAccessToken(claims)}` `` and `tests/int/current-student.spec.ts`
called an un-awaited `signIn()`, while `tsc --noEmit` reported zero errors on both.

**Where** — `src/lib/auth/session-token.ts` (the module banner states it),
`src/lib/auth/session-cookies.ts`, `src/lib/auth/session-student.ts`, `src/proxy.ts`,
and the two cookie-minting actions in `src/actions/student/`. Pinned by
`tests/unit/lib/session-cookies.spec.ts`, which reads each cookie back and verifies it
rather than asserting it is merely truthy — the one assertion that tells a token from a
pending promise. Note jose rejects a Node `Buffer` under jsdom's realm, so any spec that
touches this module needs `// @vitest-environment node`.

### A session is renewed only where cookies may be written — never in a Server Component

**Rule** — A Route Handler or Server Action that needs the signed-in student calls
`ensureSessionStudent`, which renews `coursely-access` from `coursely-refresh`. A Server
Component calls `getSessionStudent`, which only reads. Never swap them, and never fold the two
into one function. `proxy` keeps its own renewal for the paths it guards, because a protected
Server Component page cannot renew itself.

**Why it breaks silently** — both directions fail on a fifteen-minute delay, which is to say
they pass every test and every manual click-through:

- **A Server Action left on `getSessionStudent`** refuses a student whose access token lapsed
  while a refresh token good for thirty days sits in the same jar. It returns a polite,
  well-formed "please sign in" — not an error, not a log line, and indistinguishable from a
  genuinely signed-out caller. This was hidden for as long as `proxy` papered over it by
  renewing on the page request that rendered the form; its matcher no longer covers public
  pages, so nothing on one renews anything.
- **A Server Component moved to `ensureSessionStudent`** throws from `cookies().set()` — but
  only on the renewal branch, so only once the access token has actually lapsed. The page
  renders correctly in dev, in every test, and for the first fifteen minutes in production.

**Where** — `src/lib/auth/session-student.ts` (both readers; the banner states which scope each
belongs to). Renewing callers: the four actions in `src/actions/student/`,
`src/app/(frontend)/next/auth-status/route.ts`,
`src/app/(frontend)/next/notifications-count/route.ts`. Read-only callers:
`src/app/(frontend)/student/account/page.tsx`, `src/app/(frontend)/courses/[slug]/page.tsx`.
Pinned by `tests/unit/repo/session-refresh-callers.spec.ts`, which scans both renewing
directories rather than testing any one caller — the fifth action added next month is where
this would come back — and by `tests/int/current-student.spec.ts` for the behaviour itself.

### A session cannot be revoked — it can only expire

**Rule** — There is no session record anywhere: the refresh token _is_ the session, and
`proxy` renews by checking a signature, reading nothing. So no feature may promise to end a
session from the server — not "sign out everywhere", not "end other devices after a
password change", not disabling an account mid-session. Anything of that sort needs a
server-side check added back first (a `sessionVersion` on `students`, read on renewal);
adding the button alone ships a lie.

**Why it breaks silently** — every such feature has an obvious-looking implementation that
returns success. Clearing the cookies signs _this_ browser out and looks exactly like it
worked; setting `status: 'DISABLED'` writes a row and returns 200. Meanwhile the other
device holds a token that verifies on its own for `REFRESH_TTL_SEC` — 30 days, now for
_every_ session, since there is no "remember me" left to leave unticked for a shorter one
— and `status` inside a live access token is whatever it was at signing time, so even the
account gate reads stale for up to `ACCESS_TTL_SEC`. Nothing errors. The person who clicked
"sign out everywhere" believes the stolen session is dead.

**Where** — `src/lib/auth/session-token.ts` (the module banner states the trade),
`src/proxy.ts` (`resolveIdentity`, which touches no datastore),
`src/actions/student/logout.ts` (this device only) and `src/actions/student/reset-password.ts`
(the comment where the revocation used to be).

### `x-user-*` request headers are client input — `proxy` sets none

**Rule** — `proxy` returns a bare `NextResponse.next()`; it does not rewrite the request
headers. An `x-user-id`, `x-user-status` or `x-user-role` arriving on a request is
therefore whatever the caller typed, and no file in `src/` may read one. Server code that
needs the signed-in student calls `getSessionStudent()` or `ensureSessionStudent()`; public
UI asks `GET /next/auth-status` from the browser.

**Why it breaks silently** — `proxy` used to forward the verified identity in these
headers, deleting the inbound copies first so a client could not forge them. Nothing ever
read them and the forwarding was removed as dead code — but the old shape survives in
`specs/001-access-refresh-sessions/contracts/proxy-guard.md` §2, so the next person to
follow that document writes a Server Component that reads `x-user-id`. It compiles, it
renders, and it trusts an account id the visitor chose, on every route the matcher covers.
Nothing in the type system or the build says a word.

**Where** — `src/proxy.ts` (`proxy`, the `NextResponse.next()` branch). Guarded by
`tests/unit/repo/student-header-readers.spec.ts`, which fails the moment any file under
`src/` mentions one of these names; the proxy behaviour is pinned in
`tests/int/proxy-session.spec.ts` § "identity is never forwarded as a request header".

### A response that carries a session `Set-Cookie` must be `private, no-store`

**Rule** — Whenever anything writes a session cookie — renewing `coursely-access`, or clearing
both on a refresh token that no longer verifies — that response must also carry
`Cache-Control: private, no-store`. Two surfaces do it, and the rule reads differently on each:

- **`proxy`** sets it on the condition "this response carries a cookie", never a pathname or a
  method: the redirect that clears the cookies needs it just as much as the `next()` that
  renews them. A response `proxy` writes no cookie on must be left alone, so ordinary pages
  keep the cacheable header Next gave them.
- **A Route Handler that calls `ensureSessionStudent`** sets it on every response it sends,
  unconditionally. It cannot see whether the renewal fired, its body is one student's in every
  branch, and a header that depended on a cookie having been written is one more thing to get
  wrong. A new route on that reader inherits this, header included.

**Why it breaks silently** — Next does not downgrade a page's own `Cache-Control` when
middleware sets a cookie. A prerendered page carries `s-maxage=31536000`, so the renewal
response leaves the server with one visitor's JWT and a year-long _shared_-cache directive on
it at the same time. Every layer in between is then behaving correctly when it stores the pair
and hands that token to the next person who asks for the URL — and the next person is signed
in as someone else, on a browser that has done nothing but open the home page. Nothing throws,
`pnpm lint` and `tsc` are clean, and it is invisible in dev: `next dev` forces `no-cache` on
every response, and a single-origin staging without a CDN in front never reproduces it either.
On a CDN it surfaces per-POP, so it reads as an intermittent regional glitch rather than a
credential leak. This was BUG-08 — reproduced 100% against a production build behind an nginx
`proxy_cache`.

**Where** — `src/proxy.ts`, the `renew || clear` guard after both cookie branches;
`src/app/(frontend)/next/auth-status/route.ts` and
`src/app/(frontend)/next/notifications-count/route.ts`, the `NO_STORE` constant on every
`Response.json`. Pinned by `tests/int/proxy-session.spec.ts` § "a response carrying a session
cookie is never shared-cacheable" — three tests: the renewal, the clearing redirect, and the one
that fails if the header ever escapes onto a response with no cookie on it — and by the
§ "never shared-cacheable" block in each route's own spec.

The reasoning below is about `proxy` only. A Route Handler writes the header onto its own
`Response`, so nothing has to override anything.

**The part the tests do not prove** — that Next honours a `Cache-Control` set here over the
page's own. It does, on the self-hosted Node path, because the header reaches `res` before the
render (`server/lib/router-utils/resolve-routes.js` copies proxy headers into `resHeaders`,
`server/lib/router-server.js` applies them) and `server/send-payload.js` only writes the page's
own when `!res.getHeader('Cache-Control')`. Verified against Next 16.3.0; recheck it on a Next
upgrade, because the three tests above stay green even if that order changes. The edge runtime
uses `appendHeader` instead and would leave both values present — so this reasoning does not
carry to a Vercel-style deployment, and the cache layer in front must refuse to store responses
bearing `Set-Cookie` regardless.

## Key–value storage

### Anything written to `payload.kv` carries its own expiry and deletes itself on read

**Rule** — `payload.kv` has `get` / `set` / `delete` / `has` / `keys` / `clear` and **no TTL
argument anywhere**. A value that is supposed to stop being valid must therefore carry the
moment it does — an `expiresAt` field — and every read goes through one helper that checks
it and deletes the record before answering `null`. Never assume a KV entry disappears on
its own, and never add a "temporary" KV write without that field.

**Why it breaks silently** — the shape of the API invites the mistake: it is the same
`get`/`set`/`delete` surface as Redis minus the one argument that mattered, so a Redis
keyspace ported over key by key looks complete and compiles. Nothing throws; the value is
simply immortal. For the OTP challenge that means a six-digit code that stays valid forever
and a five-try lockout that never lifts, and the tests pass either way because a test issues
a code and verifies it seconds later — exactly the window in which an expiry that never
fires is indistinguishable from one that works. The rows are also invisible: the generated
`payload-kv` collection is `admin.hidden` with all four access rules `() => false`, so
nobody browsing the admin panel will ever notice them piling up.

**Where** — `src/services/otp-challenge.ts` (`readLive` is the only reader; `expiresAt` is set
in `issueOtp`), pinned by `tests/int/otp-challenge.spec.ts` § "reports expired past `expiresAt`
and drops the record on the way out". The adapter is
`node_modules/payload/dist/kv/adapters/DatabaseKVAdapter.js`, wired in by
`node_modules/payload/dist/config/defaults.js` (`config.kv = config.kv ?? databaseKVAdapter()`)
— this project declares no `kv` in `payload.config.ts`, so the records are Postgres rows in
`payload_kv`.

## Client-side state

### `themeLocalStorageKey` and `defaultTheme` exist in two modules — change both or neither

**Rule** — These two constants are declared twice. The writer imports one copy, the two readers
import the other. Until the duplication is collapsed into a single module, any change to the
key or the default must land in both files in the same commit.

**Why it breaks silently** — Both copies are plain strings, so a divergence is not a type error
and nothing at build time compares them. The pre-hydration `InitTheme` script would read a key
that `ThemeProvider` never writes, silently fall through to `getImplicitPreference()`, and set
`data-theme` from the OS setting instead. The site still renders in a valid theme — it just
ignores the user's saved choice, and `<html>` carries `suppressHydrationWarning`, so React will
not flag the mismatch either.

**Where** — Copy A: `src/providers/Theme/shared.ts:3` (`themeLocalStorageKey`, `defaultTheme`
at :5), imported by the **writer** `src/providers/Theme/index.tsx:8` (`ThemeProvider`, writes
at :34 and :36). Copy B: `src/providers/Theme/ThemeSelector/types.ts:3` (same two names),
imported by the **readers** `src/providers/Theme/InitTheme/index.tsx:4` (`InitTheme`, reads at
:30) and `src/providers/Theme/ThemeSelector/index.tsx:16` (`ThemeSelector`, reads at :26).

### Auth-dependent public UI resolves signed-in state client-side, never from `headers()` in a Server Component

**Rule** — Whether the public site treats the visitor as signed in must be decided in the
browser — `HeaderAuthControls` fetches `GET /next/auth-status`, which reads the
`coursely-access` cookie and returns `{ authenticated }`. A Server Component on a public
page must not branch its render on `cookies()`, and must not gate UI on it. Nor on an
`x-user-*` request header — `proxy` sets none, so that header is client input; see
"`x-user-*` request headers are client input" under Sessions.

**Why it breaks silently** — `src/app/(frontend)/page.tsx`, `courses/page.tsx`, and
`posts/page.tsx` set `export const dynamic = 'force-static'`. Under `force-static` Next 16
makes `headers()`, `cookies()`, and `useSearchParams()` return **empty values** rather than
erroring. A header/nav Server Component that reads `x-user-id` there still compiles, still
renders, and simply always looks signed-out — the logout control never appears for a
signed-in visitor, on exactly the pages that host the header. No warning, no build failure.

**Where** — `src/components/public/HeaderAuthControls/index.tsx` (client check) →
`src/app/(frontend)/next/auth-status/route.ts` (`GET`, signature-only, no I/O) →
`verifyAccessToken` in `src/lib/auth/session-token.ts`. Rendered by
`src/Header/Component.client.tsx`. The `force-static` declarations are in the three
`src/app/(frontend)/**/page.tsx` files above. Design rationale:
`specs/002-header-logout-ui/research.md` D1/D4.

`src/app/(frontend)/courses/[slug]/page.tsx` was the one page that broke this rule, reading
the session on the server to choose between the registration form and an enrollment badge
(`specs/007-student-enrollment`). It now follows the same shape as the header:
`src/components/public/CourseRegistration.tsx` asks
`src/app/(frontend)/next/course-status/route.ts`. Keeping the read out is necessary but not
sufficient: a dynamic segment with no `generateStaticParams` renders on every request anyway
(Next 16.3.0 `generate-static-params.md`), and that alone kept the page `ƒ` after the read
was gone. The page is cacheable only with no per-request read, no `force-dynamic`, **and** a
`generateStaticParams` — `tests/unit/repo/course-page-static.spec.ts` greps the page for all
three, because each regresses in silence: the page still renders correctly and only stops
being cacheable. Once cached, it is kept fresh by the hooks in
_"`revalidatePath` on a rewritten page takes the folder path"_. The grep proves the source,
not the result; `tests/e2e/course-page-cache.spec.ts` checks the served `Cache-Control`, and
runs only against a production server (`E2E_PROD=1`).

### An admin component's arguments to `useListDrawer` must be referentially stable, or it refetches on every render

**Rule** — `useListDrawer({ collectionSlugs, filterOptions, ... })`'s internal memoization
compares these arguments by reference, not by value (`@payloadcms/ui/dist/elements/ListDrawer/index.js`'s
React-Compiler-generated cache: `$[22] !== collectionSlugs`, `$[24] !== filterOptions`).
Passing an array or object literal built inline in the render body — `collectionSlugs:
['enrollments']`, `filterOptions: { enrollments: someWhere }` — creates a new reference every
render, so the cache never hits. Hoist a constant array to module scope; wrap a computed
filter object in `useMemo`, keyed on whatever value should actually change it.

**Why it breaks silently** — nothing throws, nothing warns, `pnpm typecheck` and `pnpm lint`
both pass, and the drawer renders correctly the first time. What actually happens is the
drawer's list refetches (`POST /admin/collections/<slug>` — logged as a `render-list` server
action call) on **every render of the parent component**, not only when the filter's meaning
changes — including renders triggered by state updates that have nothing to do with the
drawer at all. Under a fast-refreshing parent (e.g. one polling or re-rendering on its own
state) this floods the network tab and the dev server log with the same request, with no
error to point at the cause. Found while building `ClassRoster` (specs/013): its
`filterOptions` was a fresh object every render, and the drawer spammed `render-list` calls
continuously the moment the component mounted.

**Where** — `src/components/admin/ClassRoster/index.tsx` (`ENROLLMENTS_COLLECTION_SLUGS`
hoisted to module scope, `filterOptions` wrapped in `useMemo` keyed on `courseId`) — the one
admin component in this codebase that calls `useListDrawer` today. Any future one must follow
the same shape.

## Theming

### A region that must stay dark sets `data-theme="dark"`; it never reaches for `bg-black`

**Rule** — Heroes over a photo, the editor bar, a code block: anything deliberately dark in
both themes wraps in `data-theme="dark"` and then uses ordinary token classes
(`bg-background text-foreground`). The attribute re-scopes every custom property for the
subtree, and Tailwind's utilities compile to `var(--token)` rather than a baked hex, so the
dark values apply.

**Why it breaks silently** — `bg-black text-white` produces the same picture today and quietly
leaves the palette: change the tokens and that region does not follow. It is also invisible to
review, because white and black read as neutral defaults rather than colour decisions.
`theme-guard` now catches them, but only after this repo carried 14 such colours across five
files (`AdminBar`, `Footer`, both heroes, `Code`) under a guard reporting zero violations —
the keyword colours end in a word, and the palette rule was shaped around `family-number`.

**Where** — `src/heros/HighImpact/index.tsx`, `src/heros/PostHero/index.tsx`,
`src/components/public/AdminBar/index.tsx`, `src/blocks/Code/Component.client.tsx`, the
`KEYWORD_COLOURS` constant in `scripts/theme-guard.mjs`, and the "deliberately dark region"
section of [`DESIGN.md`](DESIGN.md).

### `--primary` is a surface, not a text colour — links take `--link`

**Rule** — Never paint text or an icon with `--primary` against the page background. It is a
fill for `bg-primary`, paired with `--primary-foreground`. Anything that reads as a link takes
`--link`.

**Why it breaks silently** — `--primary` is deliberately the same blue in light and dark, so
against the dark page background it sits at **2.75:1**, below WCAG AA. In light mode the same
class is 6.30:1 and looks perfect, so the defect only exists in one theme and never throws.
The button's `link` variant shipped this way, and the header nav renders exactly that variant;
`--link` in the same position is 8.59:1.

**Where** — `src/components/public/ui/button.tsx` (the `link` variant),
`src/Header/Nav/index.tsx` (the search icon), the `PAIRS` list in
`tests/unit/repo/component-roles.spec.ts`, which excludes `primary` as a foreground and says
why.

### `--accent` is a hover surface; the brand orange is `--brand-accent`

**Rule** — `bg-accent` / `text-accent-foreground` paint shadcn's subtle hover-and-focus
state, a pale blue. The signature orange lives at `--brand-accent`. Reach for `accent`
because you want "the accent colour" and you will get the wrong one.

**Why it breaks silently** — both names resolve, both compile, both render a colour, and
`theme-guard` is satisfied because neither is hardcoded. The SpeakEdge export this palette
came from used `--accent` for the orange, so anyone reading `design/src/` — or carrying a
habit from a stock shadcn project, where `--accent` is a near-white neutral — will map the
name onto the wrong role. The failure looks like a design choice: a ghost button that flares
bright orange on hover instead of tinting.

**Where** — `src/app/(frontend)/globals.css` (`--accent`, `--brand-accent`), the "Colors"
section of [`DESIGN.md`](DESIGN.md), and the consumers that fix the meaning:
`src/components/public/ui/button.tsx:16,18` (`hover:bg-accent`) and
`src/components/public/ui/select.tsx:99` (`focus:bg-accent`).

### Semantic colour tokens are pale surfaces; their `-foreground` partner is the readable one

**Rule** — `--success`, `--warning`, `--error` and `--destructive` are background tints. Text
and borders take the `-foreground` partner: `bg-success text-success-foreground`, and
`border-success-foreground` — never `border-success`.

**Why it breaks silently** — this is the reverse of stock shadcn, where `--destructive` is
the saturated colour and the `-foreground` is what sits on top of it. Copy any shadcn recipe
and `border-destructive` still produces a valid, rendered border — just a near-white one on a
near-white card, which reads as "no border" and never fails anything.

**Where** — `src/app/(frontend)/globals.css` (the four pairs and the `@source inline`
entries that keep the classes generated), `src/blocks/Banner/Component.tsx:17-19`, and the
"Semantic colours are background-first" section of [`DESIGN.md`](DESIGN.md).

### A dependency that ships its own CSS keeps its own palette until every one of its variables is mapped to a token

**Rule** — When adding a package that brings its own stylesheet — a typography plugin, a
component library, a chart or map library — map _all_ of its colour variables onto the
tokens in `globals.css`. Mapping some of them is not partial success: every one you leave
alone keeps the vendor's colour.

**Why it breaks silently** — `theme-guard` reads this project's source and never opens
`node_modules`, so it reports `0 violations` no matter how much vendor colour is on the
page. Nothing fails, nothing warns, and the result looks deliberate because vendor
palettes are tasteful greys. Only opening the real page in both light and dark reveals it.
A neutral palette hides it completely: while this project's tokens were placeholder
greyscale, the plugin's grey ramp blended in perfectly and looked correct.

`@tailwindcss/typography` is the worked example. It defines 36 `--tw-prose-*` variables;
all 36 are now mapped in `tailwind.config.mjs`, and `tests/unit/repo/prose-tokens.spec.ts`
reads the installed package to enumerate them, so a plugin upgrade that adds a 37th turns
red rather than quietly reintroducing vendor grey. Copy that shape for the next dependency:
enumerate from the package, do not hand-list.

Two things a role's `invert-` twin must respect: it points at the **same** token, because
the tokens already flip on `[data-theme='dark']` and `dark:prose-invert` would otherwise
layer a second flip and paint dark-mode text in light-mode colours.

`tests/unit/repo/theme-tokens.spec.ts` catches only the narrower failure next door: a
`var(--x)` naming a token that does not exist. A variable that is never mapped at all is
invisible to it, because there is nothing to dangle.

**Where** — `tailwind.config.mjs` (the 36 mappings and the header explaining them),
`src/app/(frontend)/globals.css` (the token file), the "Rich text (prose)" table in
[`DESIGN.md`](DESIGN.md), `src/components/public/RichText/index.tsx:74` (`enableProse`,
`dark:prose-invert`), and the blind-spot note in the header of `scripts/theme-guard.mjs`.

## Data integrity

### A race between two concurrent enrollment submissions no longer gets "already enrolled" — it gets a generic failure

**Rule** — `checkExistingEnrollment` in `src/services/student-enrollment.ts` is the only
duplicate check `createStudentEnrollment` makes: a `payload.find` immediately before
`payload.create`, no transaction around either, no `try/catch` translating a
database-level rejection into `EnrollmentAlreadyExists`. Removed 2026-09-16 — the
transaction and the catch existed to keep the enrollment insert and the now-decoupled
`ENROLLMENT_CREATED` notification insert atomic together; once the notification moved
out (see the notification-decoupling entry), neither had a reason left to stay.

A genuine race (two submissions both pass the pre-check before either writes) still cannot
double-insert — the partial unique index (`enrollments_active_student_course_idx`,
`WHERE enrollment_status <> 'CANCELLED'`, added via `afterSchemaInit` in
`src/payload.config.ts`) still rejects the second `payload.create` at the database level.
But that `ValidationError` is no longer caught here: it falls through
`createEnrollmentAction`'s `instanceof` chain (none of its classes match a raw
`ValidationError`) and the student sees the generic "Không thể đăng ký khóa học. Vui lòng
thử lại." fallback instead of "Bạn đã đăng ký khóa học này rồi."

**Why it breaks silently** — `checkExistingEnrollment`'s own code and comment read as a
complete guard; nothing there hints that the same race it cannot close (FR-002) used to be
caught one call below and no longer is. Data integrity is still fine (the unique index
still blocks the duplicate row) — what silently regressed is only the message a student in
that rare race sees. Re-adding a second write after the enrollment insert (e.g. restoring
the notification to this same call) would silently resurrect the old reason to wrap both in
a transaction — see `specs/007-student-enrollment/research.md` Decision 2 for the mechanism
this replaced before reaching for that fix without first checking whether the new write
actually needs the atomicity back.

**Where** — `src/services/student-enrollment.ts` (`checkExistingEnrollment`,
`createEnrollment`), `src/actions/student/create-enrollment.ts` (`createEnrollmentAction`'s
`instanceof` chain — a raw `ValidationError` falls through it to the generic fallback),
`src/lib/errors/enrollment.ts` (`EnrollmentAlreadyExists`, now only ever thrown by the
pre-check).

### The duplicate-enrollment partial unique index is defined twice — keep both in sync

**Rule** — `afterSchemaInit` in `src/payload.config.ts` is what dev/test's drizzle-push
reads, but prod runs `prodMigrations` instead — the same partial unique index
(`enrollments_active_student_course_idx`) also has to exist as a hand-written migration
(`src/migrations/20260914_130000_add_enrollment_active_guard.ts`) for prod to ever get it.
The two are independent definitions with nothing that checks they match.

**Why it breaks silently** — edit the `WHERE` clause or the columns in one and not the
other, and `pnpm test:int` (drizzle-push) keeps passing while prod either never gets the
guard or gets a different one — no error, no failed migration, just a duplicate-enrollment
guard that silently doesn't match between environments.

**Where** — `src/payload.config.ts` (`afterSchemaInit`),
`src/migrations/20260914_130000_add_enrollment_active_guard.ts` (the hand-written prod copy
of the same index — change one, change both).

### An advisory lock only guards a write that actually has a transaction

**Rule** — `lockClassSeats` (`src/services/class-seats.ts`) takes a Postgres advisory lock
scoped to the caller's transaction (`pg_advisory_xact_lock`, via
`payload.db.sessions[req.transactionID].db`). If `req.transactionID` is falsy — no
transaction — it silently returns without taking any lock at all; there is no fallback
locking strategy. Every ordinary Payload write path (`create`, `update`, `updateByID`) opens
a transaction before running `beforeChange` hooks, so `guardClassCapacity` and
`assignStudentsToClass` get real protection today. The moment a caller passes
`disableTransaction: true`, or hand-builds a `req` object without a `transactionID` the way
`assignStudentsToClass` itself does (`{ payload, transactionID } as PayloadRequest`), the
seat count this lock protects goes back to a plain read-then-write with no guard — the exact
race this pattern exists to close.

**Why it breaks silently** — `lockClassSeats` never throws when it has nothing to lock;
compiles, runs, returns `void` either way. Two concurrent writers into the same class still
each get a count and still each may write — nothing errors, nothing logs, the class just
quietly ends up over `maxStudents` under whatever code path skipped the transaction. The
same trap awaits any future caller who reaches for this exact "count seats, then act" shape
for a different resource and copies the lock call without also guaranteeing a transaction
wraps it.

**Where** — `src/services/class-seats.ts` (`lockClassSeats`, `countClassOccupancy` — the
latter also depends on running inside the same transaction to see rows the batch has already
written), `src/collections/Enrollments/hooks/guardClassCapacity.ts` (per-document caller,
transaction supplied by Payload itself), `src/services/class-assignment.ts`
(`assignStudentsToClass`, the batch caller — explicitly opens the transaction it passes in).

### A relationship field's `ON DELETE` behavior can only be fixed for prod, never for dev/test

**Rule** — Payload's postgres adapter exposes no per-field `onDelete` option — every
relationship column it generates via `drizzle-push` (what dev/test runs on every schema
change) gets `ON DELETE SET NULL`, unconditionally. A hand-written migration can still give
prod a stricter FK (`payments_enrollment_id_id_enrollments_id_fk` is `ON DELETE restrict` as
of `20260917_150000_convert_payments_enrollment_id_to_relationship.ts`), but dev/test's
`drizzle-push` will regenerate `SET NULL` for that same column regardless — there is no
config to make it match. The real protection has to live at the application layer
(`Enrollments/hooks/guardAgainstDeleteWithPayments.ts`, a `beforeDelete` hook, which runs
identically in every environment); the migration's `restrict` is a database-level backstop
that only exists in prod.

**Why it breaks silently** — a test against the dev/test database can never catch a
regression in the app-level guard by relying on the database to also reject the delete —
dev/test's `SET NULL` would silently null out the FK instead of erroring, while prod's
`restrict` would (separately) reject it. The two environments only agree because the app
hook runs first in both; remove that hook and they diverge with no error anywhere.

**Where** — `src/collections/Enrollments/hooks/guardAgainstDeleteWithPayments.ts` (the actual
protection, all environments), `src/migrations/20260917_150000_convert_payments_enrollment_id_to_relationship.ts`
(prod-only DB backstop). Every other relationship FK in this schema
(`payments_student_id_id_students_id_fk`, `payments_user_id_id_users_id_fk`,
`payments_proof_image_id_media_id_fk`, …) is still `SET NULL` in every environment — this is
the only column with a stricter prod migration.

### The one-payment-per-enrollment unique index is defined twice — keep both in sync

**Rule** — Same trap as the entry above, second occurrence: `payments_enrollment_id_unique_idx`
(an enrollment may have at most one payment, FR-030) is declared in `afterSchemaInit` in
`src/payload.config.ts` for dev/test's drizzle-push, and separately as a hand-written migration
(`src/migrations/20260918_100000_add_payments_enrollment_unique_idx.ts`) for prod. Nothing
checks the two agree.

**Why it breaks silently** — change the indexed column in one and not the other, and
`pnpm test:int` keeps passing while prod either never gets the one-payment guard or gets a
different one — no error, no failed migration, just silently divergent constraints between
environments.

**Where** — `src/payload.config.ts` (`afterSchemaInit`),
`src/migrations/20260918_100000_add_payments_enrollment_unique_idx.ts` (the hand-written prod
copy of the same index — change one, change both).

> > > > > > > origin/main

### `updateStudentProfile` no longer covers the enrollment-time profile write — `createEnrollmentAction` writes directly

**Rule** — Two independent call sites write a student's `fullName`/`phone`:
`updateStudentProfile` (`src/services/student-profile.ts`), used by `/tai-khoan`'s
`updateProfileAction` (via `updateStudentProfileWithAvatar`), and `createEnrollmentAction`
(`src/actions/student/create-enrollment.ts`), which calls `payload.update` on the
`students` collection directly instead of going through the service. A change made only to
`updateStudentProfile` — a new hook, a transaction wrap, an audit log, an extra field —
does not reach the enrollment-time write.

**Why it breaks silently** — both paths call `payload.update` on the same collection with
the same shape (`{ fullName, phone }`), so a manual test of either flow looks identical;
only a change that assumes both paths share one implementation exposes the split, and only
in the flow nobody re-tested. `updateStudentProfile`'s own JSDoc used to claim it was
shared by both call sites, so reading that function gave no hint the enrollment flow had
diverged.

**Where** — `src/actions/student/create-enrollment.ts` (`createEnrollmentAction`, builds
`profileChanges` from only the fields that differ from the session's student, then calls
`payload.update` itself), `src/services/student-profile.ts` (`updateStudentProfile`, the
other path — its own JSDoc no longer claims to cover enrollment).

### `find`'s `limit: 0` is not a cheap count — it disables pagination and returns every row

**Rule** — To get just a number of matching documents, call the collection's own `/count`
REST endpoint or the Local API's `payload.count()`. Never reach for `find({ ..., limit: 0
})` (Local API or REST `?limit=0`) as a "count-only" shortcut.

**Why it breaks silently** — `findOperation` computes `usePagination = pagination && limit
!== 0`; `limit: 0` takes the `!usePagination` branch and returns **every** matching
document with full field data, not an empty page with just a total. `totalDocs` in the
response is still correct, so a caller that only reads `totalDocs` gets the right number
back and everything appears to work — while the query silently fetches, populates and
serializes the entire matching set on every call. Nothing throws, nothing warns, and a
small collection hides the cost completely; it only surfaces as a real problem once the
collection is large enough for that full fetch to matter, at which point the number was
always right and nothing in review would have caught it.

**Where** — confirmed by reading
`node_modules/payload/dist/collections/operations/find.js` (`usePagination`, the
`sanitizedLimit` fallback) and `node_modules/payload/dist/collections/endpoints/count.js` /
`endpoints/index.js` (`defaultCollectionEndpoints`, the `/count` route backed by
`countOperation`, a real `SELECT count(*)`). Used correctly by
`src/services/student-notifications.ts`'s `countUnreadNotifications` (Local API
`payload.count()`) and `src/components/admin/NotificationBell/index.tsx` (REST
`GET /notifications/count`).

## Identifiers

### Document IDs are numbers here — never test a relationship value with `typeof x === 'string'`

**Rule** — To tell an unpopulated relationship from a populated one, check for the object:
`typeof value === 'object'`. Never branch on `typeof value === 'string'`, and never treat
an ID as a string when building a URL or a cache key.

**Why it breaks silently** — The adapter decides the ID type, and `postgresAdapter` issues
`integer` primary keys. A `typeof value === 'string'` branch is therefore simply never
entered: no error, no warning, the `else` runs instead and produces an empty slug, a URL
like `/posts/`, or a lookup that never happens. TypeScript is no help — it narrows the
branch to `never` and lets the dead code stand, so `pnpm typecheck` passes.

The idiom is everywhere in this codebase because it began as the MongoDB template, where
IDs really were strings. `src/payload-types.ts` was generated against Mongo too and
declared `id: string` throughout until it was regenerated.

**Where** — `src/payload.config.ts:60` (`postgresAdapter`),
`src/payload-types.ts` (`defaultIDType: number`). Two branches that can no longer run:
`src/components/public/PayloadRedirects/index.tsx:26` (`PayloadRedirects`) and
`src/blocks/RelatedPosts/Component.tsx:25` (`RelatedPosts`).

## Agent tooling

### A git worktree with no `.codegraph/` of its own answers from the parent repo's index

**Rule** — Every worktree needs its own index before CodeGraph is trusted there.
`.claude/hooks/codegraph-session-start.mjs` builds one on session start, so this holds by
itself for worktrees Claude Code opens. A worktree made by hand and used without a session —
or one opened after that hook is removed — does not get that, and must be indexed with
`codegraph init` before its answers mean anything.

**Why it breaks silently** — CodeGraph resolves a project by walking up from the working
directory, so a worktree nested under `.claude/worktrees/` finds the **parent checkout's**
index instead of failing. Measured: from an unindexed worktree, `codegraph status` reports
`Project: …/coursely` with 189 files — the main checkout — while the worktree's own tree is
never consulted. Nothing warns. The tool answers confidently about symbols and call paths from
a different branch, and `codegraph explore` prints them under a banner promising "verbatim,
current on-disk source". Once indexed, the same command reports the worktree's own path and
file count, and the two indexes stay independent.

**Where** — `.claude/hooks/codegraph-session-start.mjs` (the `existsSync` guard on
`.codegraph`, and the `shell: true` that makes the spawn work at all on Windows).
`.gitignore:28` (`.codegraph/`) keeps each index per-checkout. Upstream: colbymchenry/codegraph#155.
