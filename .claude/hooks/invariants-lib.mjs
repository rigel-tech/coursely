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
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const INVARIANTS_FILE = 'INVARIANTS.md'

// Where the Stop hook remembers what it has already said. Lives in the git dir: not
// committed, per-clone, and thrown away with the repo.
const STATE_FILE = 'invariants-stop-state.json'
const MAX_SESSIONS = 20

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

/**
 * Repo-relative paths the file points at, taken from its `file:line` pointers.
 *
 * Existence on disk is the filter, not a prefix. A `src/`-and-`tests/` prefix left
 * `tailwind.config.mjs` and `scripts/theme-guard.mjs` unwatched even though INVARIANTS.md
 * names both — and a fix to the first of those went through with the hook silent.
 * Existence also drops the bare filenames used as shorthand in prose (`importMap.js`,
 * `globals.css`), which no prefix rule could tell apart from a real path.
 *
 * A pointer to a file that has since been deleted stops being watched. That pointer is
 * already broken and wants fixing; widening the watch list would not tell anyone.
 */
export function extractTrackedPaths(text, root) {
  const base = root || process.cwd()
  const paths = new Set()
  for (const match of text.matchAll(SOURCE_PATH)) {
    const path = match[1].replace(/\\/g, '/').replace(/^\.\//, '')
    if (existsSync(join(base, path))) paths.add(path)
  }
  return paths
}

/**
 * True when this session has NOT already been reminded about exactly this set of files,
 * and records the set so the following turns stay quiet.
 *
 * Without it the hook re-fires every single turn until the doc is edited or the work is
 * pushed — and since confirming "the entry still holds" changes no file, the most common
 * and most correct outcome is the one that cannot stop the nagging. A reminder that
 * repeats gets tuned out, which is the failure this whole system exists to prevent.
 *
 * Touching a different covered file changes the set, so genuinely new work is still
 * flagged. Anything that goes wrong here returns true: the hook stays loud rather than
 * silently switching itself off.
 */
export function isNewReminder(root, sessionId, hits) {
  if (!sessionId) return true

  const gitDir = tryGitLine(['rev-parse', '--absolute-git-dir'], root)
  if (!gitDir) return true
  const path = join(gitDir, STATE_FILE)

  const key = [...hits].sort().join('\n')

  let sessions = {}
  try {
    if (existsSync(path)) {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      if (parsed && typeof parsed.sessions === 'object' && parsed.sessions) {
        sessions = parsed.sessions
      }
    }
  } catch {
    sessions = {}
  }

  if (sessions[sessionId] && sessions[sessionId].key === key) return false

  sessions[sessionId] = { key, at: new Date().toISOString() }

  // Keep the file from growing without bound as sessions come and go.
  const ids = Object.keys(sessions)
  if (ids.length > MAX_SESSIONS) {
    ids
      .sort((a, b) => (sessions[a].at < sessions[b].at ? -1 : 1))
      .slice(0, ids.length - MAX_SESSIONS)
      .forEach((id) => delete sessions[id])
  }

  try {
    writeFileSync(path, JSON.stringify({ sessions }))
  } catch {
    // Could not persist — remind again next turn rather than going quiet.
  }

  return true
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
