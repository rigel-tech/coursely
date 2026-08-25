# Contributing

## Setup

```bash
pnpm install   # installs the git hooks through husky (`prepare` script)
```

If hooks do not fire, check that `git config core.hooksPath` returns `.husky/_`, then
re-run `pnpm exec husky`.

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

## Bypassing a hook

```bash
git commit --no-verify -m "..."
git push --no-verify
```

Reserve this for emergencies. Local hooks are advisory by design — real enforcement has
to come from branch protection rules on the remote.

## Scripts

```bash
pnpm lint          # eslint across the repo
pnpm lint:fix      # eslint --fix
pnpm format        # prettier --write .
pnpm typecheck     # tsc --noEmit
pnpm test:int      # vitest
pnpm test:e2e      # playwright
```
