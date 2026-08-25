#!/usr/bin/env node
// SessionStart: put ONLY the invariant titles into context.
//
// Not the whole file: a session usually touches one area, and knowing a trap exists is
// enough to avoid tripping it — the rule itself is one Read away. Loading the full file
// every session would burn context on 90% that goes unused.
//
// Fail-open: any problem exits 0 with no output.

import { extractTitles, INVARIANTS_FILE, readInvariants, repoRoot } from './invariants-lib.mjs'

try {
  const root = repoRoot()
  if (!root) process.exit(0)

  const text = readInvariants(root)
  if (!text) process.exit(0)

  const titles = extractTitles(text)
  if (titles.length === 0) process.exit(0)

  const context = [
    `These are this repo's standing invariants — constraints that BREAK SILENTLY: violating`,
    `one still compiles, still passes review, still renders. Before changing code in any area`,
    `below, open ${INVARIANTS_FILE} and read that entry.`,
    '',
    ...titles.map((title) => `- ${title}`),
  ].join('\n')

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: context,
      },
    }),
  )
} catch {
  // Never block a session over a reminder.
}

process.exit(0)
