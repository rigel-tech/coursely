// `.claude/settings.json` is committed, so every hook command in it runs on every teammate's
// machine. CodeGraph's installer wrote `codegraph.cmd prompt-hook` — the Windows-only shim pnpm
// drops next to the POSIX one — which works for whoever ran the installer and is a
// command-not-found on every macOS and Linux clone. A hook that cannot start fails quietly, and
// the line reviews as an ordinary command string.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type HookGroup = { hooks: { command?: string }[] }

// Extensions that only resolve on one platform. `.mjs` is fine: it is passed to `node`.
const PLATFORM_SHIM = /\.(?:cmd|bat|exe|ps1)\b/i

const hookCommands = (): string[] => {
  const { hooks } = JSON.parse(readFileSync('.claude/settings.json', 'utf8')) as {
    hooks: Record<string, HookGroup[]>
  }

  return Object.values(hooks)
    .flat()
    .flatMap((group) => group.hooks.map((hook) => hook.command ?? ''))
}

describe('committed hook commands', () => {
  it('name no platform-specific executable', () => {
    const offenders = hookCommands().filter((command) => PLATFORM_SHIM.test(command))

    expect(offenders).toEqual([])
  })

  it('finds hook commands at all (guards against an empty scan passing)', () => {
    expect(hookCommands().length).toBeGreaterThan(0)
  })
})
