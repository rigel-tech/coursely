# Quickstart: Admin Notification Bell

## Prerequisites

- `docker compose up -d` (Postgres running)
- `pnpm dev` running, signed in to `/admin` as any staff (`users`) account
- At least one staff-facing notification row exists — easiest path: register a new student
  account through the public site (`ACCOUNT_CREATED` is staff-facing after this feature, per Q2)

## Manual validation

1. **Bell shows an unread count (FR-001, SC-001, Acceptance Scenario 1)**
   - Register a new student account on the public site.
   - Within 5 seconds (poll interval), open any `/admin` screen — the bell in the header's
     top-right shows an unread count of at least 1.

2. **Clicking shows the list in place, no navigation (FR-002, SC-003, Acceptance Scenario 2)**
   - Click the bell from any `/admin` screen (e.g. `/admin/collections/courses`).
   - The notification list appears without the URL changing or the page navigating away.
   - The just-registered account's notification appears in the list.

3. **Shared across staff, not per-person (Acceptance Scenario 3, Q1)**
   - Sign in as a second staff account (a different browser/incognito session).
   - Confirm the same notification appears with the same unread state — reading it as the first
     staff member marks it read for both (Q1: shared inbox, no per-staff read state).

4. **Audiences stay apart (FR-003, Acceptance Scenario 4)**
   - Sign in to the public site as the newly-registered student.
   - Confirm their own bell (specs/010) does **not** show the `ACCOUNT_CREATED` notification.
   - Confirm the admin bell does not show any of that student's own student-facing notifications
     (e.g. `ENROLLMENT_CREATED`, which stays `student`-scoped and unaffected by this feature).

5. **Zero state (Edge Case)**
   - In an environment with no staff-facing notifications yet, the bell shows no count — matches
     specs/010's own zero-state behaviour for the public bell.

## Automated coverage

See `tasks.md` for the full test list once `/speckit-tasks` runs. At minimum this validates:

- the `Notification.student` field accepts a missing value (unit/collection-config level)
- `createNotification` omits the `student` key when `studentId` is not given
- `student-registration.ts`'s `ACCOUNT_CREATED` write no longer sets `student`
- `tests/int/register-action.spec.ts`'s existing assertion is updated per the accepted ripple
  (spec.md Clarifications, research.md Decision 6)
- the admin bell component's count/list/mark-read REST calls (mocked `fetch`), matching the
  three call shapes in `data-model.md`
