# Quickstart: Payment Recorder Relationship

No `contracts/` directory: this feature changes a field on an existing Payload collection
and adds no new custom endpoint — the REST/GraphQL/Local API contract for `payments` is
Payload's standard generated collection contract, already covered by
`tests/int/payments-collection.spec.ts`.

## Prerequisites

```bash
pnpm install
docker compose up -d          # Postgres, needed for tests/int and for running the migration
```

## Apply the schema change

```bash
pnpm generate:types            # regenerates src/payload-types.ts — Payment.userId: number | User
pnpm generate:importmap        # regenerates importMap.js with RecorderCell registered
pnpm payload migrate:create    # generates the first payments-table migration (includes userId)
pnpm payload migrate           # applies it to the local Postgres instance
```

## Validate

```bash
pnpm lint                      # eslint + theme-guard
pnpm typecheck
pnpm test:unit -- payments-config     # field-shape assertions (userId relationship, optional)
pnpm test:int -- payments-collection  # userId persists + populates to a real User, like studentId
```

## Manual check (admin panel)

1. `pnpm dev`, sign in as a staff user, open `/admin/collections/payments`.
2. Create or edit a payment; set "Recorded By" — the field offers a picker over `users`
   documents, not a free-typed number (FR-002).
3. In the list view, the "Recorded By" column shows the picked account's name, falling
   back to email if no name is set (FR-001) — same visual pattern as the "Student" column.
4. Leave "Recorded By" blank on a payment and save — the list cell renders empty, no error
   (FR-003, edge case).
