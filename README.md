# Coursely

<!-- What Coursely is for its users has not been written down yet. Fill this in before the
     first outside contributor arrives — a README that only lists a stack tells a newcomer
     nothing about why any of it exists. -->

A [Payload CMS 3](https://payloadcms.com) + Next.js 16 App Router application on Postgres,
with Tailwind v4 and shadcn/ui on the front end. Payload and the site run in one Next
process: the admin panel is mounted under `/admin`, the public site is everything else.

The codebase started from the official [Payload website
template](https://github.com/payloadcms/payload/tree/main/templates/website); its docs
describe the features that shipped with it — layout builder, draft preview, live preview,
on-demand revalidation, SEO, search, redirects.

## Getting started

Requires Node (see `engines` in `package.json`), pnpm, and Postgres.

```bash
pnpm install               # also installs the git hooks, via the prepare script
cp .env.example .env       # then fill in PAYLOAD_SECRET and the *_SECRET values
docker compose up -d       # Postgres on :5432, or point DATABASE_URL at your own
pnpm dev
```

Open http://localhost:3000/admin and create the first user. To fill the site with sample
content, use the **seed database** link on the admin dashboard.

> Seeding is **destructive** — it drops the current database and repopulates it. Only run
> it on a project you are starting, or whose data you can afford to lose.

## Commands

```bash
pnpm dev          # Next dev server, admin panel included
pnpm build        # production build
pnpm lint         # eslint, then the design-token guard
pnpm typecheck    # tsc --noEmit
pnpm test:int     # vitest — needs Postgres running
pnpm test:e2e     # playwright — starts the dev server itself
```

After changing a collection, field, or admin component:

```bash
pnpm generate:types        # rewrites src/payload-types.ts
pnpm generate:importmap    # rewrites the admin import map
```

Both files are generated. Never edit them by hand.

## Where the rules live

|                                      |                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)             | How work is done here: principles, settled decisions, amendment log                    |
| [`INVARIANTS.md`](INVARIANTS.md)     | Constraints that break **silently** — read the entry before touching an area it covers |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch naming, commit format, what the git hooks run                                   |

## A note on schema changes

Postgres holds a strict schema, so a field change is a migration, not just a config edit.
In development Payload pushes schema changes automatically; that push is convenient and
lossy, and it is not how production is updated. Read Payload's [Postgres
migrations](https://payloadcms.com/docs/database/migrations) guide before the first deploy
carries real data.
