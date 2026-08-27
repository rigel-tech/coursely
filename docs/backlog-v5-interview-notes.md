# Backlog v5 — interview notes

Working notes for the rewrite of `Product_Backlog_Website_Quang_ba_Dang_ky_Khoa_hoc_v4.md`.
These record decisions and their reasons, not requirements. Delete once v5 is written.

## The point of the rewrite

v4's business content is broadly sound. Its problem is the **shape** of the stories: they are
ordered badly and depend on each other so heavily that three developers cannot work in
parallel. v5 optimises for independent, vertically-sliced stories — each one demoable on its
own on staging. Some coupling is accepted as unavoidable; what is rejected is a dependency
web rather than a chain.

## Fixed constraints

| | |
| --- | --- |
| Timeline | 2 weeks, 2 sprints of 1 week, a real staging deploy ending each |
| Team | 3 developers using Claude Code (~30 person-days total) |
| Scale | 1 instructor, ~100 students, 10–15 per class → roughly 7–10 classes |
| Operators | A single Admin |
| Payments | Never online. Admin records payment status by hand. |
| Email | SMTP |
| Document language | English titles and technical terms, Vietnamese for the detail |

Scale and the single-Admin fact retire two concerns raised against v4: no search, pagination
or performance engineering is warranted at this size, and the concurrent class-assignment
overfill race is not a practical risk. A DB-level capacity constraint stays cheap, so keep
it — but do not design around contention that cannot occur.

## Decisions taken

**Moodle is out of the product.** No Moodle Course entity, no `CourseType` discriminator, no
`MoodleURL` field, no per-course Moodle CTA, no filtering by course type. The public site
carries a single outbound link to the Moodle site from the intro UI. Everything the system
manages is an offline Course.

**The student dashboard exists.** It carries account information, the student's own
enrollments with their status, the assigned Class, and self-cancellation. This closes v4's
largest gap, where a student learned nothing at all after enrolling.

**Notifications are a first-class feature** for both Student and Admin, in-app as well as by
email. Absent from v4 entirely. Exact scope still being pinned down.

**Tuition fee is displayed** on the course page. Showing a price is not the same as taking
payment; payment stays offline and manual.

**News/blog is cut.** Everything else from the round-2 list stays in scope per the client.

**Design for the target flow, not the legacy one.** No effort is spent modelling today's
Zalo + Excel process, and no migration from it is in scope.

## Round 3 and 4 — closed out

- **Filtering** is by category and title. Courses gain a category (the `categories`
  collection already in the repo) and free tags.
- **Notifications** land at level B: in-app list with unread count plus email, for both
  Student and Admin, over seven events. No per-user on/off settings page.
- **Fee** is a numeric VND field.
- **Cancellation**: the student may self-cancel while `NEW` or `CONFIRMED`, including after
  a class assignment; blocked once payment is `PAID` (refunds are an offline conversation)
  and blocked after the class start date. Cancelling frees the seat immediately.
- **Admin dashboard** shows four work-queue figures rather than vanity metrics — at ~10
  courses, "published course count" tells the Admin nothing they cannot see at a glance.
- **Accounts split into two collections**, as the client asked: `StudentAccount` holds only
  the login identity (email, password), `Student` holds the profile. The objection raised
  against v4 does not apply, because no field is duplicated. Both rows are always created
  **in one transaction**, on self-registration and on Admin creation alike, so no orphan
  Student exists and the contact email always lives on the account. Consequence the client
  accepted: **Admin cannot create a student without their email address.**
- **Google sign-in** is wanted, for profile data only — we issue and own the session.
- **Phone** is optional at signup, required at course enrollment.
- **Performance is out of scope** by the client's decision, so v4's untestable "under 0.5
  seconds" is simply dropped rather than restated.
- **Backup** belongs to the infrastructure team, outside the backlog.
- **SMTP** via a Gmail app password to unblock sprint 1. Flagged: transactional mail from a
  `@gmail.com` address lands in spam easily, and a verification email in spam means nobody
  can register at all. Moving to a real provider is a config change, not a code change,
  because Payload's adapter is nodemailer-based.
- **Staging** is a self-managed VPS on Docker Compose with Postgres alongside. The repo
  already ships a `Dockerfile` and `docker-compose.yml`; no email adapter is installed yet.

## Still open after the interview

- **UI language.** `CLAUDE.md` marks i18n `[UNDECIDED]` and requires the decision before the
  first screen carrying user-facing strings — which is `US-101`, in sprint 1. v5 assumes
  Vietnamese-only with no i18n library. **Needs an explicit sign-off.**
- Reports and CSV export (`US-506`, `US-507`) are not specified in detail; they fell outside
  the two sprints, so a short clarification round is needed before they are built.

## Scope risk

Round 2 cut only News. Reports, exports, filtering and search, the Admin dashboard, account
view/edit and the payment-change email all remain in scope. Against ~30 person-days that is
more than fits, and the concern has been raised once and answered — so it is the client's
call, not a blocker.

Dropping Moodle bought back real budget: no type discriminator, no dual CTA path, no URL
management, no type filter. A gap remains. The agreed mitigation is to order the backlog so
the two-sprint cut line is **explicit in the document** rather than discovered in week two.
