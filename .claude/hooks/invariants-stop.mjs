#!/usr/bin/env node
// Stop: speak ONLY when both are true —
//   1. this session changed a file INVARIANTS.md points at, and
//   2. INVARIANTS.md itself was not touched.
//
// The silence in the common case is what keeps the reminder worth reading. A hook that
// fires on every turn gets tuned out within a day, and then the whole system is dead.
//
// Fail-open: any problem exits 0 with no output.

import { readFileSync } from 'node:fs'

import {
  changedFiles,
  extractTrackedPaths,
  INVARIANTS_FILE,
  readInvariants,
  repoRoot,
} from './invariants-lib.mjs'

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

try {
  // Loop guard: if we already blocked once this stop, let the session end.
  let payload = {}
  try {
    payload = JSON.parse(readStdin() || '{}')
  } catch {
    payload = {}
  }
  if (payload.stop_hook_active) process.exit(0)

  const root = repoRoot(payload.cwd)
  if (!root) process.exit(0)

  const text = readInvariants(root)
  if (!text) process.exit(0)

  const changed = changedFiles(root)
  if (changed.size === 0) process.exit(0)

  // Condition 2: the file was maintained this session — nothing to nag about.
  if (changed.has(INVARIANTS_FILE)) process.exit(0)

  // Condition 1: intersect what changed with what the file points at.
  const tracked = extractTrackedPaths(text)
  const hits = [...changed].filter((file) => tracked.has(file))
  if (hits.length === 0) process.exit(0)

  const reason = [
    `This session changed ${hits.length} file(s) covered by ${INVARIANTS_FILE}, and`,
    `${INVARIANTS_FILE} was not touched:`,
    '',
    ...hits.map((file) => `  - ${file}`),
    '',
    `Open ${INVARIANTS_FILE}, find the entry that names each file, and confirm it still holds:`,
    `  - If a change here SUPERSEDED an entry, rewrite or delete that entry in this same`,
    `    commit. Never leave the old rule beside the new one.`,
    `  - If this work UNCOVERED a new constraint that breaks silently, is forward-facing, and`,
    `    is true today, add it now rather than later.`,
    `  - If every entry still holds as written, say so and finish — no edit needed.`,
  ].join('\n')

  process.stdout.write(JSON.stringify({ decision: 'block', reason }))
} catch {
  // Never block a session over a reminder.
}

process.exit(0)
