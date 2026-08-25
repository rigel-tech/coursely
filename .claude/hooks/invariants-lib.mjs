// Shared helpers for the INVARIANTS.md hooks.
//
// Runtime is Node on purpose: `engines.node` in package.json already requires it, and
// neither Next 16 nor Payload 3 can build without it. `jq` is NOT installed on every
// machine that works on this repo, and a hook that shells out to a missing binary would
// fail open and do nothing at all — the exact silent failure this system exists to stop.
//
// Every export below is fail-open: on any error it returns an empty/neutral value so the
// caller can exit 0 without ever blocking the session.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const INVARIANTS_FILE = 'INVARIANTS.md'

// Returns raw stdout, NOT trimmed: `git status --porcelain` encodes the status in a
// fixed-width `XY ` prefix, and trimming would eat the leading space of an unstaged
// entry and shift every path by one character.
function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  })
}

function tryGit(args, cwd) {
  try {
    return git(args, cwd)
  } catch {
    return null
  }
}

/** Same, for the single-value queries where trailing whitespace is just noise. */
function tryGitLine(args, cwd) {
  const out = tryGit(args, cwd)
  return out === null ? null : out.trim() || null
}

/** Repo root, or null when we are not in a git repo. Works inside worktrees. */
export function repoRoot(startDir) {
  const cwd = startDir || process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const fromGit = tryGitLine(['rev-parse', '--show-toplevel'], cwd)
  if (fromGit) return fromGit

  // Fallback for a non-git checkout: trust Claude Code's own project dir if it holds the file.
  const fallback = process.env.CLAUDE_PROJECT_DIR
  if (fallback && existsSync(join(fallback, INVARIANTS_FILE))) return fallback

  return null
}

/** Full text of INVARIANTS.md, or null when it is absent/unreadable. */
export function readInvariants(root) {
  try {
    const path = join(root, INVARIANTS_FILE)
    if (!existsSync(path)) return null
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

/** The `###` headings — one line per invariant, which is the whole rule. */
export function extractTitles(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('### '))
    .map((line) => line.slice(4).trim())
    .filter(Boolean)
}

const SOURCE_PATH = /`((?:\.\/)?[\w@.\-/[\]()]+\.(?:tsx?|jsx?|mjs|cjs|mts|s?css|json))(?::\d+)?`/g

/** Repo-relative source paths the file points at, taken from its `file:line` pointers. */
export function extractTrackedPaths(text) {
  const paths = new Set()
  for (const match of text.matchAll(SOURCE_PATH)) {
    const path = match[1].replace(/\\/g, '/').replace(/^\.\//, '')
    // Only paths that look like they live in this repo's source tree.
    if (/^(src|tests)\//.test(path)) paths.add(path)
  }
  return paths
}

/**
 * Files this session could have touched: the working tree AND commits not yet pushed.
 * Sessions usually end after the work is committed, so the working tree alone would
 * leave the hook blind exactly when the most code has changed.
 */
export function changedFiles(root) {
  const files = new Set()
  const add = (out) => {
    if (!out) return
    for (const line of out.split(/\r?\n/)) {
      const path = line.trim()
      if (path) files.add(path.replace(/\\/g, '/'))
    }
  }

  // Working tree: staged, unstaged and untracked. -z avoids quoting surprises.
  const status = tryGit(['-c', 'core.quotepath=false', 'status', '--porcelain=v1', '-z'], root)
  if (status !== null) {
    const entries = status.split('\0')
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.length < 4) continue
      const code = entry.slice(0, 2)
      add(entry.slice(3))
      // A rename/copy stores its source path in the next NUL-separated record.
      if (code.includes('R') || code.includes('C')) i++
    }
  }

  // Unpushed commits, preferring the real upstream.
  const upstream = tryGitLine(
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
    root,
  )
  if (upstream) {
    add(tryGit(['diff', '--name-only', `${upstream}..HEAD`], root))
    return files
  }

  // No upstream — a fresh feature branch, which is when commits pile up fastest.
  // Fall back to the main branch so the hook is not blind precisely then.
  const head = tryGitLine(['rev-parse', '--abbrev-ref', 'HEAD'], root)
  for (const base of ['origin/main', 'origin/master', 'main', 'master']) {
    if (!tryGitLine(['rev-parse', '--verify', '--quiet', base], root)) continue
    if (head && base.replace(/^origin\//, '') === head) break // already on the base branch
    add(tryGit(['diff', '--name-only', `${base}...HEAD`], root))
    break
  }

  return files
}
