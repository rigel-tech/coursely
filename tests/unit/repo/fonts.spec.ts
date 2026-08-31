// Nothing else in the repo guards the join between `next/font` and the token file.
// `theme-tokens.spec.ts` deliberately skips globals.css, because the font variables are
// injected at runtime by the layout's className and would look dangling to it. That leaves
// the whole chain unchecked:
//
//   layout.tsx  variable: '--font-x'  →  <html className={font.variable}>  →  globals.css
//   `--font-sans: var(--font-x)`      →  typography tokens in DESIGN.md
//
// Break any link and the page still renders — in the browser's default font, or with a
// synthesised faux-bold, or with Vietnamese glyphs falling out to a different typeface
// mid-sentence. All three look like a design choice rather than a defect.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const LAYOUT = 'src/app/(frontend)/layout.tsx'
const TOKENS = 'src/app/(frontend)/globals.css'
const DESIGN = 'DESIGN.md'

const read = (path: string): string => readFileSync(path, 'utf8')

type FontCall = {
  binding: string
  variable: string | null
  subsets: string[]
  /** Empty means a variable font loaded without an explicit weight: every weight is available. */
  weights: string[]
}

/** `const beVietnamPro = Be_Vietnam_Pro({ … })` calls in the layout. */
const fontCalls = (): FontCall[] => {
  const src = read(LAYOUT)
  const list = (body: string, key: string): string[] => {
    const m = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`).exec(body)
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : []
  }

  return [...src.matchAll(/const\s+(\w+)\s*=\s*\w+\(\{([\s\S]*?)\}\)/g)].map((m) => {
    const [, binding, body] = m
    const variable = /variable:\s*'([^']+)'/.exec(body)
    const single = /weight:\s*'([^']+)'/.exec(body)
    return {
      binding,
      variable: variable ? variable[1] : null,
      subsets: list(body, 'subsets'),
      weights: single && single[1] !== 'variable' ? [single[1]] : list(body, 'weight'),
    }
  })
}

/** `--font-sans: var(--font-x)` declarations in the token file's @theme block. */
const fontTokens = (): Record<string, string> => {
  const css = read(TOKENS)
  const out: Record<string, string> = {}
  for (const m of css.matchAll(/(--font-[\w-]+):\s*var\(\s*(--[\w-]+)\s*\)/g)) out[m[1]] = m[2]
  return out
}

describe('fonts reach the page', () => {
  it('loads at least the sans and mono families', () => {
    // Without this the checks below would pass vacuously on an empty list.
    expect(fontCalls().filter((f) => f.variable).length).toBeGreaterThanOrEqual(2)
  })

  it('names the same CSS variables the token file reads', () => {
    const declared = new Set(fontCalls().map((f) => f.variable))
    const orphanedReference = Object.entries(fontTokens())
      .filter(([, target]) => !declared.has(target))
      .map(([token, target]) => `${token} reads ${target}, which ${LAYOUT} never declares`)

    expect(orphanedReference).toEqual([])
  })

  it('applies every loaded font variable to <html>', () => {
    const src = read(LAYOUT)
    const html = /<html[^>]*>/.exec(src)?.[0] ?? ''
    const notApplied = fontCalls()
      .filter((f) => f.variable)
      .filter((f) => !html.includes(`${f.binding}.variable`))
      .map((f) => f.binding)

    expect(notApplied).toEqual([])
  })

  it('requests the vietnamese subset for every family', () => {
    const missing = fontCalls()
      .filter((f) => f.variable)
      .filter((f) => !f.subsets.includes('vietnamese'))
      .map((f) => `${f.binding}: subsets ${JSON.stringify(f.subsets)}`)

    expect(missing).toEqual([])
  })

  it('loads every weight the DESIGN.md typography tokens ask for', () => {
    // A weight that was never loaded does not fail — the browser synthesises it, and the
    // result is a smeared fake bold that no test or lint step will ever mention.
    const tokens = fontTokens()
    const byVariable = new Map(fontCalls().map((f) => [f.variable, f]))

    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(read(DESIGN))?.[1] ?? ''
    const typography = fm.slice(fm.indexOf('\ntypography:'), fm.indexOf('\nrounded:'))

    const uncovered: string[] = []
    for (const m of typography.matchAll(
      /fontFamily:\s*var\((--font-[\w-]+)\)[\s\S]*?fontWeight:\s*(\d+)/g,
    )) {
      const [, family, weight] = m
      const font = byVariable.get(tokens[family])
      if (!font) {
        uncovered.push(`${family} maps to nothing loaded`)
        continue
      }
      // No explicit weight means a variable font: the whole range is available.
      if (font.weights.length > 0 && !font.weights.includes(weight)) {
        uncovered.push(`${font.binding} is missing weight ${weight}`)
      }
    }

    expect(typography).not.toBe('')
    expect([...new Set(uncovered)]).toEqual([])
  })
})
