# Contributing

## Setup

```bash
pnpm install   # installs the git hooks through husky (`prepare` script)
```

If hooks do not fire, check that `git config core.hooksPath` returns `.husky/_`, then
re-run `pnpm exec husky`.

## Spec-driven development

Work driven by a coding agent goes through [Spec Kit](https://github.com/github/spec-kit).
Adding or changing behaviour with an agent runs the workflow first; a typo, a comment, a
dependency bump or a one-line fix does not.

Install once — `uv` is the only prerequisite, it fetches its own Python:

```bash
winget install --id=astral-sh.uv    # or: irm https://astral.sh/uv/install.ps1 | iex
uv tool install specify-cli
```

The repo is already initialised — `.specify/` and the skills in `.claude/skills/speckit-*`
are committed, so there is nothing to run per checkout. Drive it from Claude Code:

| Step | Skill                | Produces                                        |
| ---- | -------------------- | ----------------------------------------------- |
| 1    | `/speckit-specify`   | `specs/<feature>/spec.md` — what is being built |
| 2    | `/speckit-plan`      | `plan.md` — the technical approach              |
| 3    | `/speckit-tasks`     | `tasks.md` — ordered, checkable steps           |
| 4    | `/speckit-implement` | the code                                        |

`/speckit-clarify` (before planning), `/speckit-analyze` and `/speckit-checklist` are optional
gates. `/speckit-converge` re-reads the codebase and appends whatever the plan still owes.

**`/speckit-constitution` is off limits.** The constitution lives in [`CLAUDE.md`](CLAUDE.md);
`.specify/memory/constitution.md` only points at it, and that skill would overwrite the
pointer with its own template.

Scripts are the `sh` flavour and run on Windows through the git bash that ships with git.
Do not re-init with `--script py`: it bakes an absolute path to the installing machine's
Python into every skill file.

## Branch naming

```
<type>/<kebab-case-description>
```

| Valid                     | Invalid                                |
| ------------------------- | -------------------------------------- |
| `feat/course-enrollment`  | `Feature/CourseEnrollment` (uppercase) |
| `fix/login-redirect-loop` | `fix_login` (no `/`)                   |
| `chore/bump-payload-3.88` | `my-branch` (no type)                  |

Allowed types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore`
`revert` `hotfix` `release`.

Rename the branch you are on with `git branch -m feat/your-feature`.
The rule itself lives in [`.husky/branch-rules.sh`](.husky/branch-rules.sh) — change it
there and both hooks pick it up.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint:

```
feat(courses): add lesson progress tracking
fix(auth): handle expired refresh token
chore(deps): bump payload to 3.88.0
```

The rules come from `@commitlint/config-conventional`, so they are not restated here —
run `pnpm exec commitlint --print-config` to see the resolved set. This repo only
overrides two things in [`commitlint.config.mjs`](commitlint.config.mjs): scopes must be
kebab-case, and body/footer lines may be any length.

## Working on `main`

`main` is protected locally: the hooks refuse both a commit made while `main` is checked
out and a push that targets `main`.

```bash
git switch main && git pull
git switch -c feat/course-enrollment
git add . && git commit -m "feat(courses): add enrollment flow"
git push -u origin feat/course-enrollment
# open a pull request
```

## What the hooks run

| Hook         | Steps                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `pre-commit` | Reject `main` → validate branch name → `lint-staged` (`eslint --fix` + `prettier --write` on staged files) |
| `commit-msg` | `commitlint`                                                                                               |
| `pre-push`   | Reject pushes to `main` → validate branch name → `pnpm typecheck`                                          |

Configuration: [`.husky/`](.husky), [`.lintstagedrc.json`](.lintstagedrc.json),
[`commitlint.config.mjs`](commitlint.config.mjs).

## Standing invariants

[`INVARIANTS.md`](INVARIANTS.md) lists the constraints that **break silently** — the ones
no linter, type checker, or test can catch. Read the relevant entry before working in an
area it covers.

It is not a changelog. If your change supersedes an entry, rewrite or delete that entry in
**the same commit**; if your work uncovers a new silent-breaking constraint, add it while
you implement, not later.

**Before opening a pull request:** if you touched a file `INVARIANTS.md` names, confirm the
entry naming it still holds as written.

## Bypassing a hook

```bash
git commit --no-verify -m "..."
git push --no-verify
```

Reserve this for emergencies. Local hooks are advisory by design — real enforcement has
to come from branch protection rules on the remote.

## Scripts

```bash
pnpm lint          # eslint across the repo, then the design-token guard
pnpm lint:fix      # eslint --fix
pnpm lint:theme    # design-token guard on its own
pnpm format        # prettier --write .
pnpm typecheck     # tsc --noEmit
pnpm test:unit     # vitest, no infrastructure needed
pnpm test:int      # vitest, needs Postgres
pnpm test:e2e      # playwright
```
