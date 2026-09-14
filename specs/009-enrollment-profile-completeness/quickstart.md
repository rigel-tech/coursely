# Quickstart: Enrollment Profile Completeness

## Prerequisites

```bash
docker compose up -d
pnpm dev
```

Sign in as a student. In `/admin`, blank out that student's `fullName` and `phone` to set
up the incomplete-profile case.

## 1 — Incomplete profile is shown and editable (User Story 1, scenario 1)

Open a course page you are not yet enrolled in. Below the registration control, confirm:
full name and phone inputs are visible and empty; email is visible and **not** an input
(read-only, per Q1).

## 2 — Submitting incomplete still refuses (scenario 2)

Leave full name blank, submit. Expected: no enrollment created; a message naming the
missing profile info, distinct from every other refusal (not signed in, already enrolled,
registration window, etc.).

## 3 — Filling in and submitting succeeds, and the profile is saved (scenario 3)

Fill in full name and a valid phone number, submit. Expected: enrollment created; reload
`/admin`'s student record and confirm `fullName`/`phone` are now saved there too.

## 4 — Already-complete profile does not block registration (scenario 4)

Repeat with a student whose profile is already complete. Expected: fields show pre-filled
and editable, registration succeeds without any extra step.

## 5 — Bypassing the page cannot skip the gate (scenario 5, FR-003)

Call `createEnrollmentAction` directly (e.g. from a `tests/int` case, or a scratch script)
with a blank `fullName` for a signed-in `ACTIVE` student who has none on file. Expected:
refused with the same message as scenario 2 — the UI was never the enforcement point.

## 6 — A profile edit survives an unrelated registration failure (Edge Case, FR-005)

Using a student already enrolled in the course (so the attempt will be refused as a
duplicate — specs/008), submit the form with a _corrected_ full name/phone. Expected: the
duplicate-enrollment refusal is shown, but the student's `fullName`/`phone` in `/admin`
reflect the correction anyway — the profile save is not rolled back by the enrollment
refusal.
