# Quickstart: Payment Record Collection

Validates the feature end-to-end once implemented. Field shapes: [`data-model.md`](data-model.md).
Access rules: [`contracts/payments-api.md`](contracts/payments-api.md).

## Prerequisites

- `docker compose up -d` (Postgres running)
- `pnpm dev` (or the app already running)
- A `users` (staff) account to sign in with — `students` accounts must be rejected, see below

## 1. Collection is registered and typed

```sh
pnpm generate:types
pnpm generate:importmap
```

Expected: `src/payload-types.ts` gains a `Payment` type; no errors. Commit the regenerated
files together with the collection (never hand-edited — see `CLAUDE.md` Structure & commands).

## 2. Create a payment as staff (US1)

1. Sign in to `/admin` with a `users` account.
2. Open **Payments** (under the Academic group) → Create New.
3. Fill `enrollmentId`, `studentId`, a positive whole `amount`, a `paymentMethod`, and
   `paymentDate`. Save.

Expected: record saves, appears in the list with the `defaultColumns` set.

## 3. Required-field and amount validation

1. Try saving with `amount` blank, or `paymentMethod` blank, or `paymentDate` blank.
2. Try saving with `amount` = `0`, `-5`, or `12.5`.

Expected: every case is rejected with a field-level error; nothing is saved.

## 4. Proof image is optional (US2)

1. Create a payment leaving `proofImage` empty → saves successfully.
2. Edit a payment, upload an image to `proofImage` → saves, image is visible on the record.

## 5. Bilingual labels (US3)

1. Switch the admin panel language to English, open Payments → every field label and every
   `paymentMethod` option reads in English.
2. Switch to Vietnamese → same fields/options read in Vietnamese.

## 6. Access control

1. Call `GET /api/payments` with no auth cookie → rejected/empty result, no data leaks.
2. Sign in as a `students` account (not `users`) and call `GET /api/payments` →
   rejected, same as unauthenticated (see `authenticated` predicate).
3. Sign in as `users` staff → full CRUD succeeds via REST and via `/admin`.

## 7. Automated checks

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:int   # needs docker compose up -d
```

All green. The exact test files are decided at the `/speckit-tasks` step, per this repo's
"Tests — every change" rule (required/suggested lists, settled by `AskUserQuestion`).
