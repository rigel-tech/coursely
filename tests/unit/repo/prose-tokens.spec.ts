// `@tailwindcss/typography` ships its own slate/gray ramp and paints every `prose` surface
// with it. `theme-guard` never opens node_modules, so it reports a clean tree no matter how
// much vendor colour is on the page — the blind spot its own header warns about.
//
// This file is the check that can see into the plugin: it reads the installed package,
// enumerates every `--tw-prose-*` variable it defines, and fails when one is not mapped to
// a token. A plugin upgrade that introduces a new variable therefore turns this red instead
// of quietly reintroducing vendor grey.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const CONFIG = 'tailwind.config.mjs'
const DESIGN = 'DESIGN.md'
const PLUGIN = 'node_modules/@tailwindcss/typography/src/styles.js'

const read = (path: string): string => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    throw new Error(`${path} is missing — run \`pnpm install\``)
  }
}

/** Every `--tw-prose-*` custom property the installed plugin defines. */
const pluginVariables = (): string[] => [
  ...new Set([...read(PLUGIN).matchAll(/--tw-prose-[a-z-]+/g)].map((m) => m[0])),
]

/** Every `--tw-prose-*` custom property the config maps, and what it maps it to. */
const mapped = (): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const m of read(CONFIG).matchAll(/'(--tw-prose-[a-z-]+)':\s*'([^']*)'/g)) {
    out[m[1]] = m[2]
  }
  return out
}

const roleOf = (variable: string): string => variable.replace(/^--tw-prose-(invert-)?/, '')

describe('prose variables are mapped to design tokens', () => {
  it('reads a plugin that actually defines prose variables', () => {
    // Guards the regex and the path: an empty list would make every check below vacuous.
    expect(pluginVariables().length).toBeGreaterThan(30)
  })

  it('maps every prose variable the installed plugin defines', () => {
    const covered = mapped()
    const unmapped = pluginVariables().filter((v) => !(v in covered))

    expect(unmapped).toEqual([])
  })

  it('points a role and its invert twin at the same token', () => {
    // Our tokens already flip on [data-theme='dark'], so `prose-invert` must not reintroduce
    // a second, differently-flipped value. Same token both sides, or dark rich text silently
    // renders light-mode colours.
    const covered = mapped()
    const disagreeing = Object.keys(covered)
      .filter((v) => v.startsWith('--tw-prose-invert-'))
      .filter((v) => covered[v] !== covered[`--tw-prose-${roleOf(v)}`])
      .map((v) => `${v} = ${covered[v]}, base = ${covered[`--tw-prose-${roleOf(v)}`]}`)

    expect(disagreeing).toEqual([])
  })

  it('never maps a prose variable to a literal colour', () => {
    const notATokenReference = Object.entries(mapped())
      .filter(([, value]) => !/^var\(--[\w-]+\)$/.test(value))
      .map(([name, value]) => `${name}: ${value}`)

    expect(notATokenReference).toEqual([])
  })
})

describe('tailwind.config.mjs carries no colour of its own', () => {
  it('has no hex or colour-function literal anywhere in it', () => {
    // theme-guard scans `src/` only, so this file sits outside it. Without this check a
    // hardcoded colour here passes `pnpm lint` in silence.
    const src = read(CONFIG)
    const hex = [...src.matchAll(/#([0-9a-fA-F]+)(?![\w-])/g)]
      .filter((m) => [3, 4, 6, 8].includes(m[1].length))
      .map((m) => m[0])
    const fns = [...src.matchAll(/\b(?:rgba?|hsla?|oklch|lab|lch)\s*\(/g)].map((m) => m[0])

    expect([...hex, ...fns]).toEqual([])
  })
})

describe('DESIGN.md documents the prose mapping', () => {
  /** Rows of the `| `role` | `--token` |` table under the rich-text heading. */
  const documented = (): Record<string, string> => {
    const doc = read(DESIGN)
    const start = doc.indexOf('### Rich text')
    if (start < 0) throw new Error('DESIGN.md has no `### Rich text` section')

    const section = doc.slice(start, doc.indexOf('\n## ', start + 1))
    const out: Record<string, string> = {}
    for (const m of section.matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*`(--[\w-]+)`\s*\|/gm)) {
      out[m[1]] = m[2]
    }
    return out
  }

  it('lists a token for every role the config maps', () => {
    const roles = [...new Set(Object.keys(mapped()).map(roleOf))]
    const undocumented = roles.filter((r) => !(r in documented()))

    expect(roles.length).toBeGreaterThan(10)
    expect(undocumented).toEqual([])
  })

  it('documents the same token the config actually uses', () => {
    const covered = mapped()
    const wrong = Object.entries(documented())
      .filter(([role, token]) => covered[`--tw-prose-${role}`] !== `var(${token})`)
      .map(
        ([role, token]) =>
          `${role}: DESIGN.md says ${token}, config says ${covered[`--tw-prose-${role}`]}`,
      )

    expect(wrong).toEqual([])
  })
})
