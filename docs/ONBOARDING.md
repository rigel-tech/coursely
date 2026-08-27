# Onboarding checklist

One pass, top to bottom, on a fresh clone. This page is the **order**; the detail behind each
step lives in the linked document, and is not repeated here.

The order is load-bearing in exactly one place — section 3. The agent tooling is wired up by
files that are already committed, and those files run the moment a session starts, so anything
they call has to exist on the machine before you open Claude Code.

## 1. Machine prerequisites

| Tool   | Check                 | Notes                                                                                |
| ------ | --------------------- | ------------------------------------------------------------------------------------ |
| Node   | `node -v`             | `^18.20.2 \|\| >=20.9.0` — the range is `engines` in `package.json`                  |
| pnpm   | `pnpm -v` → `11.18.0` | `corepack enable` picks up the version pinned in `packageManager`. Never npm or yarn |
| Docker | `docker -v`           | Only for the Postgres container; your own Postgres 16 works too                      |
| git    | `git -v`              | On Windows, its bundled bash is what the Spec Kit scripts run on                     |

- [ ] All four report a version.

## 2. The application

- [ ] `pnpm install` — also installs the git hooks, through the `prepare` script.
- [ ] `cp .env.example .env`.
- [ ] Fill the three secrets. Any high-entropy string does:
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — once each for
      `PAYLOAD_SECRET`, `CRON_SECRET`, `PREVIEW_SECRET`.
- [ ] Set `DATABASE_URL`. `docker-compose.yml` creates the database with user and password both
      `postgres`, so against the shipped container the value is
      `postgres://postgres:postgres@127.0.0.1:5432/coursely`. The credential-less URL in
      `.env.example` will not authenticate against it.
- [ ] `docker compose up -d`, then `docker compose ps` until Postgres reports `healthy`.
- [ ] `pnpm dev`, open <http://localhost:3000/admin>, create the first user.
- [ ] Optional: fill the site from the **seed database** link on the admin dashboard. Seeding
      **drops the current database** — only on a checkout whose data you can lose.

## 3. Agent tooling

Install both CLIs **before** opening Claude Code in this repo. `.claude/settings.json` calls
`codegraph` from a `SessionStart` hook and again on every prompt, and the session hook is
deliberately fail-open (see the banner in `.claude/hooks/codegraph-session-start.mjs`): with no
binary on the machine the index is never built, nothing reports an error, and the agent quietly
falls back to grep.

- [ ] `pnpm add -g @colbymchenry/codegraph@1.6.0`, then `codegraph --version` → `1.6.0`.
      Background: [CONTRIBUTING § CodeGraph](../CONTRIBUTING.md#codegraph).
- [ ] Spec Kit, if you will drive work with an agent — `winget install --id=astral-sh.uv` then
      `uv tool install specify-cli`. Nothing to run per checkout; `.specify/` is committed.
      Background: [CONTRIBUTING § Spec-driven development](../CONTRIBUTING.md#spec-driven-development).
- [ ] Open Claude Code at the repo root and **trust the folder** when asked. Until you do,
      nothing in `.claude/settings.json` applies — not the hooks, not the MCP permissions, not
      the Context7 plugin.
- [ ] `claude plugin list` → `context7@claude-plugins-official` … `Status: enabled`.
- [ ] `/mcp`, from inside a session → `codegraph` connected.
- [ ] `.codegraph/` exists in the checkout — the session hook builds it on first entry, ~3s.
- [ ] Read [`CLAUDE.md`](../CLAUDE.md) — how work is done here — and skim
      [`INVARIANTS.md`](../INVARIANTS.md). You are not expected to memorise the invariants; you
      are expected to open the entry before touching an area it names.

## 4. Git hooks

- [ ] `git config core.hooksPath` → `.husky/_`. If not, `pnpm exec husky`.
- [ ] Know what they refuse before they refuse it: commits made on `main`, pushes to `main`, and
      branch names outside `<type>/<kebab-case>`. Rules and the full hook table:
      [CONTRIBUTING § Branch naming](../CONTRIBUTING.md#branch-naming).

## 5. Tests

Split by the infrastructure they need, not by subject.

- [ ] `pnpm test:unit` — no infrastructure, must pass on a clean machine.
- [ ] `pnpm test:int` — needs the Postgres from step 2 running.
- [ ] `pnpm exec playwright install chromium` — once per machine; `pnpm test:e2e` cannot start a
      browser without it. It starts its own dev server.

## 6. Green

- [ ] `pnpm lint && pnpm typecheck && pnpm test:unit`

Three greens mean the checkout is set up. This is also the bar every change has to clear before
it counts as done.

## Editor

`.vscode/extensions.json` recommends ESLint and Prettier; VS Code offers them on first open.
Formatting is enforced by the pre-commit hook either way, so the extensions are convenience.

## When something is off

| Symptom                                              | Cause                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Agent greps instead of answering from the graph      | `codegraph` not installed, or the folder was never trusted                                                    |
| Hooks do not fire on commit                          | `core.hooksPath` unset — step 4                                                                               |
| `password authentication failed` on `pnpm dev`       | `DATABASE_URL` without credentials — step 2                                                                   |
| Context7 returns a quota error                       | Shared anonymous pool exhausted; take a free key — [CONTRIBUTING § Context7](../CONTRIBUTING.md#context7-mcp) |
| Payload types or admin panel out of sync after edits | `pnpm generate:types` / `pnpm generate:importmap`                                                             |
