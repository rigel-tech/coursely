#!/usr/bin/env node
// SessionStart: build the CodeGraph index if this checkout has none.
//
// CodeGraph keeps its index in a per-directory `.codegraph/`, and upstream has no way to
// share one between git worktrees (colbymchenry/codegraph#155). Claude Code creates
// worktrees under `.claude/worktrees/`, so without this every worktree session starts with
// no graph at all — the tool is configured, reports nothing, and quietly falls back to grep.
//
// Indexing this repo takes about three seconds, so doing it on first entry is cheaper than
// any sharing scheme would be. An existing index needs nothing: CodeGraph auto-syncs.
//
// Fail-open, like the invariants hooks: a missing binary means the developer has not run the
// global install yet, which is not this hook's problem to report. Any error exits 0.

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

try {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  if (existsSync(join(root, '.codegraph'))) process.exit(0)

  // `shell: true` is load-bearing on Windows: pnpm installs `codegraph` as a POSIX shim plus
  // a separate `codegraph.cmd`, and execFileSync without a shell finds neither. Naming the
  // .cmd directly would then break every macOS and Linux clone of this committed hook.
  execFileSync('codegraph', ['init'], {
    cwd: root,
    stdio: 'ignore',
    timeout: 120_000,
    windowsHide: true,
    shell: true,
  })
} catch {
  // Fall through: no index this session, grep still works.
}

process.exit(0)
