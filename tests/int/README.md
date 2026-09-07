# Integration tests

Each spec spins up Payload in `beforeAll` and drives real Postgres + Redis, so
`docker compose up -d` must be running first. Payload syncs the schema to the
database on the first `getPayload`, so a fresh database needs no migrate step.

Specs are grouped by the slice of the app they cover so a module can be run on
its own — locally while working on that area, and as a CI matrix leg.

| Module                    | Script                       | Covers                                                                                                                          |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `tests/int/auth/`         | `pnpm test:int:auth`         | sign-in, the two-cookie boundary, logout / logout-all, password reset, the proxy guard, token verification, `/next/auth-status` |
| `tests/int/registration/` | `pnpm test:int:registration` | self-registration, the OTP store, OTP verification and resend                                                                   |
| `tests/int/platform/`     | `pnpm test:int:platform`     | rate-limit primitives, the Payload API smoke test, the email adapter wiring                                                     |

`pnpm test:int` runs all three. CI (`.github/workflows/deploy.yml`,
`integration-tests` job) runs one matrix leg per module against throwaway
Postgres + Redis service containers, and gates `build-and-push`.

A new spec goes in the module folder whose area it exercises; the `**` glob in
`vitest.config.mts` picks it up with no config change.
