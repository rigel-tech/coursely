// `specify init --script py` writes the absolute path of the installing machine's Python
// into the Setup step of every skill file it generates. It works for whoever ran init, so
// the change reviews clean and commits clean, and dies only on the next person's clone.
// `--script sh` emits the relative `.specify/scripts/bash/*.sh` instead, which run through
// the git bash that ships with git — .gitattributes pins *.sh to LF so they survive checkout.
//
// CONTRIBUTING.md carries the command; this is the alarm if someone re-inits without it.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SKILLS_DIR = '.claude/skills'

// An absolute path ending in an interpreter — the shape `--script py` bakes in. The
// interpreter tail is what keeps a plain `https://` URL from matching the drive-letter arm.
const MACHINE_PATH = /(?:[A-Za-z]:[\\/]|\/(?:home|Users)\/)[^\s`]*(?:python|\.exe)/

const speckitSkills = (): string[] =>
  readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('speckit-'))
    .map((entry) => join(SKILLS_DIR, entry.name, 'SKILL.md'))

describe('spec-kit install', () => {
  it('records the sh script flavour', () => {
    const options = JSON.parse(readFileSync('.specify/init-options.json', 'utf8'))

    expect(options.script).toBe('sh')
  })

  it('no speckit skill invokes an interpreter by absolute path', () => {
    const offenders = speckitSkills().filter((file) =>
      MACHINE_PATH.test(readFileSync(file, 'utf8')),
    )

    expect(offenders).toEqual([])
  })

  it('finds the speckit skills at all (guards against an empty scan passing)', () => {
    expect(speckitSkills().length).toBeGreaterThan(0)
  })
})
