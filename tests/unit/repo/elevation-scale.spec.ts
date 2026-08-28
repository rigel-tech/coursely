// Elevation is the third time a dependency's own palette reached the page unmapped, after
// the typography plugin's grey ramp and Tailwind's type and radius ladders. Tailwind's
// shadows are `rgb(0 0 0 / …)` — pure black, and static across themes.
//
// Static is the defect. Composite a 10% black shadow over the dark page background #0b1220
// and you get #0a101d: one or two levels per channel, invisible. Every card, dialog and
// hover lift in this project lost its elevation in dark mode, with nothing to report it —
// the shadow renders, it just cannot be seen.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DESIGN = 'DESIGN.md'
const TOKENS = 'src/app/(frontend)/globals.css'

/** Steps listed in the Elevation & Depth table: `| `xs` | … | `shadow-xs` |`. */
const declaredSteps = (): string[] => {
  const doc = readFileSync(DESIGN, 'utf8')
  const start = doc.indexOf('## Elevation & Depth')
  if (start < 0) throw new Error('DESIGN.md has no `## Elevation & Depth` section')

  const section = doc.slice(start, doc.indexOf('\n## ', start + 1))
  return [...section.matchAll(/^\|\s*`shadow-([\w-]+)`\s*\|/gm)].map((m) => m[1])
}

/** `--elevation-*` declarations inside one block of the token file. */
const elevationIn = (selector: string): Record<string, string> => {
  const css = readFileSync(TOKENS, 'utf8')
  const start = css.indexOf(`${selector} {`)
  const end = css.indexOf('\n}', start)
  if (start < 0 || end < 0) throw new Error(`${TOKENS} has no \`${selector}\` block`)

  return Object.fromEntries(
    [...css.slice(start, end).matchAll(/^\s*--elevation-([\w-]+):\s*([^;]+);/gm)].map((m) => [
      m[1],
      m[2].trim(),
    ]),
  )
}

/** What `@theme inline` exposes as a Tailwind shadow utility. */
const exposedSteps = (): string[] => {
  const css = readFileSync(TOKENS, 'utf8')
  return [...css.matchAll(/--shadow-([\w-]+):\s*var\(--elevation-[\w-]+\)/g)].map((m) => m[1])
}

const componentSources = (): { file: string; source: string }[] => {
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.tsx')) files.push(full.split('\\').join('/'))
    }
  }
  walk('src')
  return files.map((file) => ({ file, source: readFileSync(file, 'utf8') }))
}

describe('the elevation scale is the one DESIGN.md declares', () => {
  it('exposes exactly the steps the document lists', () => {
    const declared = declaredSteps()
    const exposed = exposedSteps()

    expect(declared.length).toBeGreaterThan(2)
    expect([...exposed].sort()).toEqual([...declared].sort())
  })

  it('defines every step in both themes', () => {
    const declared = declaredSteps()
    const light = elevationIn(':root')
    const dark = elevationIn("[data-theme='dark']")

    const missing = declared.flatMap((step) => [
      ...(light[step] ? [] : [`light is missing --elevation-${step}`]),
      ...(dark[step] ? [] : [`dark is missing --elevation-${step}`]),
    ])

    expect(missing).toEqual([])
  })

  it('gives dark its own value for every step', () => {
    // A step present in light and absent from dark inherits the light value, which is the
    // ink-tinted shadow this scale exists to replace — straight back to invisible.
    const light = elevationIn(':root')
    const dark = elevationIn("[data-theme='dark']")

    const identical = declaredSteps()
      .filter((step) => light[step] === dark[step])
      .map((step) => `--elevation-${step} is the same in both themes`)

    expect(identical).toEqual([])
  })
})

describe('components stay inside the elevation scale', () => {
  it('uses no shadow the document does not declare', () => {
    const declared = new Set(declaredSteps())
    const strays: string[] = []

    for (const { file, source } of componentSources()) {
      for (const m of source.matchAll(/\bshadow-([a-z0-9]+)(?![\w[-])/g)) {
        if (!declared.has(m[1])) strays.push(`${file}: shadow-${m[1]}`)
      }
    }

    expect([...new Set(strays)]).toEqual([])
  })
})
