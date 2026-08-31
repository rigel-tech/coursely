// Shape drifts the same way colour did, and just as quietly: `rounded-xl` on a card is a
// valid class that renders a corner nobody chose, because Tailwind ships its own radius
// scale underneath ours. There is no guard for it — theme-guard only reads colour.
//
// Spacing is checked here too, but only to record a conclusion: Tailwind v4 generates every
// step this design uses from `--spacing`, so there is nothing to wire. Verified in a real
// build — `p-4.5` compiles to `calc(var(--spacing) * 4.5)`. The test exists so the next
// person does not go looking for the config that "must be missing".

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DESIGN = 'DESIGN.md'
const TOKENS = 'src/app/(frontend)/globals.css'

/** Tailwind v4's own base step; every spacing utility is a multiple of it. */
const SPACING_STEP_PX = 4

const frontMatter = (): string => {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(DESIGN, 'utf8'))?.[1]
  if (!fm) throw new Error('DESIGN.md has no front matter')
  return fm
}

/** A flat `<level>: <value>` block from the front matter. */
const scale = (section: string): Record<string, string> => {
  const lines = frontMatter().split(/\r?\n/)
  const start = lines.findIndex((l) => l.trimEnd() === `${section}:`)
  if (start < 0) throw new Error(`DESIGN.md front matter has no \`${section}:\``)

  const out: Record<string, string> = {}
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break
    const m = /^\s+([\w-]+):\s*(.+?)\s*$/.exec(line)
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

/** `--radius…` declarations Tailwind reads out of the token file's @theme block. */
const compiledRadii = (): Record<string, string> => {
  const css = readFileSync(TOKENS, 'utf8')
  const out: Record<string, string> = {}
  for (const m of css.matchAll(/^\s*--radius(?:-([\w-]+))?:\s*([^;]+);/gm)) {
    out[m[1] ?? 'default'] = m[2].trim()
  }
  return out
}

const componentSources = (): { file: string; source: string }[] => {
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx$/.test(entry.name)) files.push(full)
    }
  }
  walk('src')
  return files.map((file) => ({ file, source: readFileSync(file, 'utf8') }))
}

describe('the radius scale is the one DESIGN.md declares', () => {
  it('compiles exactly the levels the document lists', () => {
    const declared = scale('rounded')
    const compiled = compiledRadii()

    // `full` is Tailwind's own pill radius and needs no override; the rest must be ours.
    const ours = Object.entries(declared).filter(([level]) => level !== 'full')
    const wrong = ours
      .filter(([level, value]) => compiled[level] !== value)
      .map(
        ([level, value]) =>
          `${level}: DESIGN.md says ${value}, globals.css has ${compiled[level] ?? '(unset)'}`,
      )

    expect(ours.length).toBeGreaterThan(2)
    expect(wrong).toEqual([])
  })

  it('leaves no derived radius behind', () => {
    // The shadcn template derived the scale from one --radius with calc(). The design's
    // 6 / 9 / 14 is not an arithmetic run, so the derivation cannot express it; a leftover
    // calc() would silently win over the literal next to it.
    const css = readFileSync(TOKENS, 'utf8')
    const derived = [...css.matchAll(/^\s*--radius[\w-]*:\s*calc\([^;]*;/gm)].map((m) =>
      m[0].trim(),
    )

    expect(derived).toEqual([])
  })
})

describe('components stay inside the scale', () => {
  it('uses no rounded level the document does not declare', () => {
    const declared = new Set(Object.keys(scale('rounded')))
    const strays: string[] = []

    for (const { file, source } of componentSources()) {
      for (const m of source.matchAll(/\brounded(?:-([a-z0-9]+))?(?![\w[-])/g)) {
        const level = m[1] ?? 'default'
        if (!declared.has(level)) strays.push(`${file}: rounded-${level}`)
      }
    }

    expect([...new Set(strays)]).toEqual([])
  })

  it('uses no arbitrary radius', () => {
    const arbitrary = componentSources().flatMap(({ file, source }) =>
      [...source.matchAll(/\brounded(?:-[a-z0-9]+)?-\[[^\]]+\]/g)].map((m) => `${file}: ${m[0]}`),
    )

    expect(arbitrary).toEqual([])
  })
})

describe('the spacing scale needs no configuration', () => {
  it('lands every documented step on a Tailwind spacing multiple', () => {
    const offScale = Object.entries(scale('spacing'))
      .map(([level, value]) => [level, Number.parseFloat(value)] as const)
      .filter(([, px]) => !Number.isFinite(px) || ((px / SPACING_STEP_PX) * 2) % 1 !== 0)
      .map(([level, px]) => `${level}: ${px}px is not a multiple of ${SPACING_STEP_PX / 2}px`)

    expect(Object.keys(scale('spacing')).length).toBeGreaterThan(4)
    expect(offScale).toEqual([])
  })
})
