#!/bin/sh
# Single source of truth for the local branch rules, shared by pre-commit and pre-push.

# Branches that must not be committed or pushed to directly (space separated).
PROTECTED_BRANCHES="main"

# <type>/<kebab-case-description>, e.g. feat/course-enrollment or fix/login-redirect
BRANCH_PATTERN='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|hotfix|release)/[a-z0-9]+([._/-][a-z0-9]+)*$'

red() { printf '\033[0;31m%s\033[0m\n' "$1"; }
dim() { printf '\033[0;90m%s\033[0m\n' "$1"; }

is_protected_branch() {
  for _b in $PROTECTED_BRANCHES; do
    if [ "$1" = "$_b" ]; then
      return 0
    fi
  done
  return 1
}

# assert_branch_allowed <action>
assert_branch_allowed() {
  _action="$1"
  _branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

  # Detached HEAD (rebase, bisect, checkout <sha>) has no branch to validate.
  if [ -z "$_branch" ] || [ "$_branch" = "HEAD" ]; then
    return 0
  fi

  if is_protected_branch "$_branch"; then
    echo ""
    red "✖ Refusing to $_action directly on protected branch: $_branch"
    echo ""
    echo "  Work on a branch and open a pull request instead:"
    dim "    git switch -c feat/your-feature"
    echo ""
    exit 1
  fi

  if ! printf '%s' "$_branch" | grep -Eq "$BRANCH_PATTERN"; then
    echo ""
    red "✖ Invalid branch name: $_branch"
    echo ""
    echo "  Expected format: <type>/<kebab-case-description>"
    echo "  Allowed types:   feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert, hotfix, release"
    echo ""
    echo "  Examples:"
    dim "    feat/course-enrollment"
    dim "    fix/login-redirect-loop"
    dim "    chore/bump-payload-3.88"
    echo ""
    echo "  Rename the current branch with:"
    dim "    git branch -m feat/your-feature"
    echo ""
    exit 1
  fi
}
