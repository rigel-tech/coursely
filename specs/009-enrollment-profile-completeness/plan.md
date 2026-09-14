# Implementation Plan: Enrollment Profile Completeness

**Branch**: `feat/student-enrollment` (existing branch — no new branch for this feature; see spec header)

**Date**: 2026-09-14

**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-enrollment-profile-completeness/spec.md`

## Summary

A signed-in student registering for a course sees their own full name, phone, and email
below the registration control; full name and phone are editable in place and required —
email is read-only (Q1). `createEnrollmentAction` enforces completeness server-side (Q2),
saving whatever was submitted before attempting the enrollment (so a correction survives
an unrelated refusal, FR-005), using a schema scoped to this context rather than the
existing `/tai-khoan` one (Q3). No new entity, no new collection field.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (existing stack — unchanged)

**Primary Dependencies**: none new. Reuses `react-hook-form` + `zodResolver` (already a
dependency, already used by `LoginForm`), and the existing `VIETNAM_PHONE_REGEX` constant.

**Storage**: PostgreSQL — no schema change. One additional `payload.update` on the
existing `students` table per registration attempt (only when a signed-in `ACTIVE`
student reaches that step).

**Testing**: Vitest — `tests/unit` only. No new `tests/int` case is required by this
feature's own logic (no concurrency concern, no raw SQL); the existing `tests/int`
enrollment coverage from specs/007/008 continues to exercise the same action end to end.

**Target Platform**: Server (Next.js server action) + two existing client components
(`CourseRegistrationCTA`, `CourseRegistrationForm`)

**Project Type**: Web application (existing single Next.js + Payload project)

**Performance Goals**: N/A beyond "no added step for an already-complete profile" (SC-002)
— the extra `payload.update` is a single indexed write on `id`, always fast.

**Constraints**: Must not change `/tai-khoan`'s accepted input (Q3); must not block a
signed-out visitor's sign-in redirect with the wrong refusal (research.md Decision 1);
must not roll back a profile save when the enrollment step fails afterward (FR-005).

**Scale/Scope**: One new validation schema file, one new service function, one changed
action signature, two changed client components, one changed server page (prop wiring).
No new screens, no new route.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — still holds._

- **Simple first**: no new library, no new collection, no new transaction machinery. The
  profile save is one `payload.update`; the enrollment path is entirely unchanged
  (Decision 3).
- **Change only what was asked**: `/tai-khoan`, `ProfileForm`, `updateProfileAction`,
  `profileSchema`, and `createStudentEnrollment`'s signature are all explicitly left
  untouched (Decisions 3 and 5). The only files touched are the ones this feature's
  behaviour requires.
- **Tests — every change**: required/suggested lists go to the user via `AskUserQuestion`
  before any test file is written, per the settled decision — not part of this artifact.
- **Invariants are maintained as you go**: no new silently-breaking constraint was
  uncovered by this design — unlike specs/008 (which surfaced a real Payload
  error-handling gotcha), this feature's mechanics are a straightforward sequential
  save-then-create with no non-obvious coupling. Confirmed: nothing to add to
  INVARIANTS.md.
- **Spec Kit workflow**: followed — `/speckit-specify` → this `/speckit-plan` →
  `/speckit-tasks` → the test-list-then-implement cadence already used for specs/007/008.

No violations requiring `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/009-enrollment-profile-completeness/
├── plan.md          # This file
├── research.md      # Phase 0 output — 6 decisions
├── data-model.md     # Phase 1 output
└── quickstart.md     # Phase 1 output — 6 scenarios
```

No `contracts/` directory: `createEnrollmentAction`'s new input shape
(`CreateEnrollmentInput`) is documented in `data-model.md` and at its own declaration site,
matching how specs/007/008 handled their own action-shape changes.

### Source Code (repository root)

Existing single-project layout — no new top-level directory.

```text
src/
├── lib/validation/
│   └── enrollment-profile-schema.ts   # new — enrollmentProfileSchema, imports
│                                         VIETNAM_PHONE_REGEX from profile-schema.ts
├── services/
│   └── student-enrollment.ts          # + ensureCompleteProfile(studentId, fullName, phone)
├── actions/student/
│   └── create-enrollment.ts           # signature: courseId -> CreateEnrollmentInput;
│                                         + profile-completeness gate after standing check
├── components/public/
│   ├── CourseRegistrationCTA.tsx      # + props fullName?/phone?/email?, passed through
│   └── forms/
│       └── CourseRegistrationForm.tsx # + two editable inputs, one read-only email display,
│                                         zodResolver(enrollmentProfileSchema) for inline errors
└── app/(frontend)/courses/[slug]/
    └── page.tsx                       # pass student.fullName/phone/email to the CTA
                                          when a student is signed in

tests/unit/
├── services/student-enrollment.spec.ts        # + ensureCompleteProfile cases
├── actions/student-enrollment-action.spec.ts  # update ALL existing calls to the new
│                                                 CreateEnrollmentInput shape (breaking
│                                                 change from specs/007/008's calls);
│                                                 + profile-completeness gate cases
└── components/
    ├── course-registration-form.spec.tsx      # + field rendering, inline validation,
    │                                             submit payload shape
    └── course-registration-cta.spec.tsx       # + prop pass-through
```

**Structure Decision**: single existing project, no restructuring. One new small module
(`enrollment-profile-schema.ts`); every other touched file already exists.

**Explicit ripple called out for review**: every existing test in
`tests/unit/actions/student-enrollment-action.spec.ts` that calls
`createEnrollmentAction(12)` or asserts a bare-number call must be updated to the object
shape. This is the one place this feature's design cost is paid in already-shipped code
from specs/007/008, and it is unavoidable given Decision 4's rejection of a parallel
second action.

## Phase 0 — done

See `research.md`: 6 decisions (check ordering; independent commit for the profile save;
`createStudentEnrollment` left untouched; the action's new input shape; a scoped
validation schema reusing only the phone regex; profile fields shown only when signed in).

## Phase 1 — done

See `data-model.md` (no new entity; the new schema and input shape) and `quickstart.md`
(6 runnable scenarios covering every acceptance scenario and edge case in spec.md).

## Next

`/speckit-tasks`, then the required/suggested test list via `AskUserQuestion` before any
code — matching specs/007/008.
