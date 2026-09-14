# Quickstart: Enrollment Duplicate Guard

Validates the feature end-to-end against a real Postgres instance. See `data-model.md` for
the constraint shape and `research.md` for why each mechanism was chosen.

## Prerequisites

```bash
docker compose up -d   # Postgres + Redis
pnpm install
```

## 1 — Schema applied

Start dev once so drizzle push picks up the new `afterSchemaInit` index (or run the new
migration against a database that uses `prodMigrations`):

```bash
pnpm dev   # Ctrl+C once it finishes booting; push runs on startup
```

Confirm the index exists:

```bash
docker compose exec postgres psql -U postgres -d coursely -c \
  "\d+ enrollments" | grep enrollments_active_student_course_idx
```

Expected: one line naming the index, with `WHERE (enrollment_status <> 'CANCELLED'::...)`
in its definition.

## 2 — Ordinary registration is unaffected (SC-004)

Sign in as a student with no prior enrollment in some course, submit the registration.
Expected: success message, one `enrollments` row created — identical to behaviour before
this feature.

## 3 — Duplicate is refused (SC-001, SC-002, User Story 1 scenario 1)

Submit the same registration again for the same student and course.

Expected: refused with the message from `EnrollmentAlreadyExists` ("Bạn đã đăng ký khóa
học này rồi."), and:

```bash
docker compose exec postgres psql -U postgres -d coursely -c \
  "SELECT count(*) FROM enrollments WHERE student_id = <id> AND course_id = <id>;"
```

still returns `1`.

## 4 — Re-registration after cancellation succeeds (FR-008, Q1)

Set the existing enrollment's `enrollmentStatus` to `CANCELLED` (via `/admin`), then submit
the registration again for the same student and course.

Expected: success, and the count query above now returns `2` — one `CANCELLED`, one `NEW`.

## 5 — The concurrent case (FR-002, SC-003)

Fire two submissions for the same signed-in student and course as close to simultaneously
as practical (two terminals):

```bash
for i in 1 2; do
  curl -s -X POST http://localhost:3000/api/enrollments-test-only-if-exposed &
done
wait
```

If no HTTP endpoint exposes the action directly, exercise this at the service level instead
via `tests/int` (see Required Tests in `tasks.md`) — the two-connection race is what that
suite's concurrency test drives directly, since a browser-level double-click is not a
reliable enough trigger to assert on in a quickstart.

Expected: exactly one row exists afterward regardless of which request "won"; the loser
sees the same refusal as scenario 3, never a raw database error (FR-006).
