# Quickstart: Student Enrollment

Validates all four stories end-to-end. See `data-model.md` for field/constraint shapes and
`research.md` for why each mechanism was chosen.

## Prerequisites

```bash
docker compose up -d   # Postgres + Redis
pnpm dev
```

Confirm the Story 3 index exists (applied by drizzle push on `pnpm dev` startup, or by the
migration in a `prodMigrations` environment):

```bash
docker compose exec postgres psql -U postgres -d coursely -c \
  "\d+ enrollments" | grep enrollments_active_student_course_idx
```

Expected: one line naming the index, with `WHERE (enrollment_status <> 'CANCELLED'::...)` in
its definition.

## Story 1 — Sign-in gate

1. Sign out. Open a course page, press "Đăng ký khóa học". Expected: no enrollment created,
   redirected to the sign-in screen.
2. Sign in from there. Expected: land back on that same course page, at its public
   (`/khoa-hoc/<slug>`) address, registration control available.
3. Press the registration control again. Expected: enrollment created, control switches to
   showing enrollment status without a reload.
4. Tamper with the submitted return destination (e.g. via devtools). Expected: still returned
   to the course page for the course actually being registered for.

## Story 2 — Profile completeness

1. In `/admin`, blank out a student's `fullName` and `phone`. Sign in as them, open a course
   page. Expected: below the registration control, full name and phone show as empty inputs;
   email shows as plain text (read-only).
2. Leave full name blank, submit. Expected: no enrollment created; a message naming what's
   missing, distinct from every other refusal.
3. Fill in full name and a valid phone, submit. Expected: enrollment created; `/admin` shows
   the saved `fullName`/`phone`.
4. Repeat with a student whose profile is already complete. Expected: all three fields show
   as plain text, registration succeeds with no extra step.
5. Call `createEnrollmentAction` directly (bypassing the page) with a blank `fullName` for a
   signed-in `ACTIVE` student who has none on file. Expected: refused with the same message
   as step 2 — the UI was never the enforcement point.
6. Using a student already enrolled in the course (so the attempt will be refused as a
   duplicate — Story 3), submit with a _corrected_ full name/phone. Expected: the
   duplicate-enrollment refusal is shown, but `/admin` reflects the profile correction anyway
   — not rolled back by the enrollment refusal.

## Story 3 — Duplicate guard

1. Register normally for a course with no prior enrollment. Expected: success, one
   `enrollments` row.
2. Submit the same registration again. Expected: refused with "Bạn đã đăng ký khóa học này
   rồi.", and:
   ```bash
   docker compose exec postgres psql -U postgres -d coursely -c \
     "SELECT count(*) FROM enrollments WHERE student_id = <id> AND course_id = <id>;"
   ```
   still returns `1`.
3. Set that enrollment's `enrollmentStatus` to `CANCELLED` in `/admin`, submit again.
   Expected: success, the count above now returns `2` (one `CANCELLED`, one `NEW`).
4. The concurrent case: fire two submissions for the same student/course as close to
   simultaneously as practical. A browser double-click is not a reliable enough trigger to
   assert on by hand — this is what `tests/int/enrollment-duplicate-guard.spec.ts` drives
   directly, two connections against real Postgres. Expected (verified by that test): exactly
   one row exists afterward regardless of which request "won"; the loser sees the same
   refusal as step 2, never a raw database error.

## Story 4 — Distinct refusal messages

1. Submit a registration for a course whose registration window has not opened yet.
   Expected: a message saying so, distinct from every other refusal.
2. Submit for a course whose registration deadline has passed. Expected: a distinct message
   for that too.
3. Submit while holding a session for an account awaiting e-mail verification. Expected:
   told so, on the course page, not sent to the sign-in screen.
4. Same for a disabled account. Expected: told so, on the course page.
5. Confirm each of steps 1–4 above, plus Story 2's and Story 3's refusals, are all distinct
   strings from each other and from the generic "Không thể đăng ký khóa học. Vui lòng thử
   lại." — and that the generic message still appears for an unmapped/unexpected failure.
