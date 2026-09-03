// DESIGN.md's `components:` block is a promise: this component is built from these tokens.
// Nothing checked it, so the promise drifted — the input spec named
// `muted-foreground-subtle` for its placeholder while the component used
// `muted-foreground`, and three badge variants were specified with no badge to put them on.
//
// Neither shows up anywhere else. `theme-guard` is satisfied because both are tokens, the
// contrast test is satisfied because both pairs are readable, and the page renders. Only a
// check that reads the spec and the component together can see it.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const DESIGN = 'DESIGN.md'
const UI = 'src/components/public/ui'

/** Which file implements a `components:` entry. Prefix before the first `-`, or the name. */
const fileFor = (entry: string): string => `${UI}/${entry.split('-')[0]}.tsx`

/**
 * How a spec property becomes a Tailwind utility.
 *
 * `border` and `radius` are absent on purpose. Every element already takes `--border` from
 * `@layer base { * { @apply border-border } }` in globals.css, so a card carrying no
 * `border-border` class is still correct; and the radius scale is documented but not yet
 * wired, so `{rounded.md}` has no class to look for.
 */
const UTILITY: Record<string, string> = {
  background: 'bg-',
  foreground: 'text-',
  placeholder: 'placeholder:text-',
}

/** `components:` as `{ 'badge-success': { background: '{colors.success}', … } }`. */
const componentSpecs = (): Record<string, Record<string, string>> => {
  const doc = readFileSync(DESIGN, 'utf8')
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(doc)?.[1]
  if (!fm) throw new Error('DESIGN.md has no front matter')

  const lines = fm.split(/\r?\n/)
  const start = lines.findIndex((l) => l.trimEnd() === 'components:')
  if (start < 0) throw new Error('DESIGN.md front matter has no `components:` section')

  const out: Record<string, Record<string, string>> = {}
  let current: string | null = null
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break
    const entry = /^ {2}([\w-]+):\s*$/.exec(line)
    if (entry) {
      current = entry[1]
      out[current] = {}
      continue
    }
    const prop = /^ {4}([\w-]+):\s*'([^']*)'/.exec(line)
    if (prop && current) out[current][prop[1]] = prop[2]
  }
  return out
}

describe('DESIGN.md components: is what the code actually builds', () => {
  it('specifies more than a couple of components', () => {
    expect(Object.keys(componentSpecs()).length).toBeGreaterThan(5)
  })

  it('implements every component it specifies, with the tokens it names', () => {
    const problems: string[] = []

    for (const [entry, props] of Object.entries(componentSpecs())) {
      const file = fileFor(entry)
      let source: string
      try {
        source = readFileSync(file, 'utf8')
      } catch {
        problems.push(`${entry}: ${file} does not exist`)
        continue
      }

      for (const [prop, value] of Object.entries(props)) {
        const prefix = UTILITY[prop]
        if (!prefix) continue

        const token = /^\{colors\.([\w-]+)\}$/.exec(value)?.[1]
        if (!token) {
          problems.push(`${entry}.${prop}: ${value} is not a {colors.…} reference`)
          continue
        }

        const utility = new RegExp(`${prefix.replace(':', ':')}${token}(?![\\w-])`)
        if (!utility.test(source)) {
          problems.push(`${entry}.${prop}: ${file} never uses ${prefix}${token}`)
        }
      }
    }

    expect(problems).toEqual([])
  })
})
