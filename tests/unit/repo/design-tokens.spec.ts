// DESIGN.md is the human-authored source of truth for the public palette; globals.css is
// the machine-readable copy Tailwind actually compiles. Two copies of the same hex string
// is a deliberate trade: it keeps the document readable without a build step, and every
// test here exists to stop the two from drifting apart in silence.
//
// Everything checked here is invisible to `theme-guard`. That guard only asks "did you
// hardcode a colour outside the token file" — it cannot see a token defined in light but
// forgotten in dark, or one never exposed to Tailwind at all. Both compile, both render,
// both are wrong.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const DESIGN = 'DESIGN.md'
const TOKENS = 'src/app/(frontend)/globals.css'

/** Section headings the design.md spec requires to appear in this order when present. */
const CANONICAL_SECTIONS = [
  'Overview',
  'Colors',
  'Typography',
  'Layout',
  'Elevation & Depth',
  'Shapes',
  'Components',
  "Do's and Don'ts",
]

const design = (): string => readFileSync(DESIGN, 'utf8')
const tokens = (): string => readFileSync(TOKENS, 'utf8')

const frontMatter = (src: string): string => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)
  if (!m) throw new Error('DESIGN.md has no YAML front matter')
  return m[1]
}

/**
 * Read one top-level front-matter block into a flat map.
 *
 * Deliberately not a YAML parser. The token sections this reads are two levels deep with
 * scalar leaves, and the repo has no YAML dependency — pulling one in to read a file this
 * project itself authors would be more machinery than the format needs.
 */
const block = (fm: string, section: string): Record<string, string> => {
  const lines = fm.split(/\r?\n/)
  const start = lines.findIndex((l) => l.trimEnd() === `${section}:`)
  if (start < 0) throw new Error(`DESIGN.md front matter has no \`${section}:\` section`)

  const body: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break // next top-level key ends the block
    if (line.trim() && !line.trim().startsWith('#')) body.push(line)
  }
  if (body.length === 0) return {}

  // Only keys at the block's own indent are tokens. Anything deeper is a property of a
  // composite token, and the spec lets a component reference the composite itself
  // (`{typography.label-md}`), so a composite is recorded with an empty value.
  const indentOf = (l: string): number => l.length - l.trimStart().length
  const baseIndent = indentOf(body[0])

  const out: Record<string, string> = {}
  for (const line of body) {
    if (indentOf(line) !== baseIndent) continue
    const m = /^\s*([\w-]+):\s*(.*?)\s*$/.exec(line)
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

/** Read the custom properties declared directly inside one CSS block. */
const cssBlock = (css: string, selector: string): Record<string, string> => {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`${TOKENS} has no \`${selector}\` block`)
  const end = css.indexOf('\n}', start)
  if (end < 0) throw new Error(`\`${selector}\` block in ${TOKENS} is never closed`)

  const out: Record<string, string> = {}
  for (const m of css.slice(start, end).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    out[m[1]] = m[2].trim()
  }
  return out
}

const isHex = (v: string): boolean => /^#[0-9a-fA-F]{3,8}$/.test(v)

const colourTokens = (css: string, selector: string): Record<string, string> =>
  Object.fromEntries(Object.entries(cssBlock(css, selector)).filter(([, v]) => isHex(v)))

describe('DESIGN.md front matter', () => {
  it('parses and carries the keys the design.md spec requires', () => {
    const fm = frontMatter(design())

    expect(/^name:\s*\S/m.test(fm)).toBe(true)
    expect(fm).toMatch(/^colors:$/m)
    // The spec requires at least a `primary` colour token.
    expect(Object.keys(block(fm, 'colors'))).toContain('primary')
  })

  it('orders its ## sections the way the spec prescribes', () => {
    const headings = [...design().matchAll(/^##\s+(.+?)\s*$/gm)]
      .map((m) => m[1])
      .filter((h) => CANONICAL_SECTIONS.includes(h))

    const expected = CANONICAL_SECTIONS.filter((s) => headings.includes(s))
    expect(headings).toEqual(expected)
  })

  it('has no duplicate section heading', () => {
    const headings = [...design().matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1])
    expect(headings).toEqual([...new Set(headings)])
  })

  it('resolves every {section.token} reference it makes', () => {
    const fm = frontMatter(design())
    const dangling = [...fm.matchAll(/\{([\w-]+)\.([\w-]+)\}/g)]
      .filter(([, section, token]) => !(token in block(fm, section)))
      .map((m) => m[0])

    expect(dangling).toEqual([])
  })
})

describe('DESIGN.md and globals.css agree', () => {
  it('every colour in DESIGN.md matches the token globals.css compiles', () => {
    const fm = frontMatter(design())
    const light = cssBlock(tokens(), ':root')
    const dark = cssBlock(tokens(), "[data-theme='dark']")

    const mismatched = Object.entries(block(fm, 'colors')).flatMap(([name, value]) => {
      const forDark = name.endsWith('-dark')
      const token = `--${forDark ? name.slice(0, -'-dark'.length) : name}`
      const actual = (forDark ? dark : light)[token]

      return actual?.toLowerCase() === value.toLowerCase()
        ? []
        : [`${name}: DESIGN.md says ${value}, ${token} is ${actual ?? '(undefined)'}`]
    })

    expect(mismatched).toEqual([])
  })
})

describe('globals.css token structure', () => {
  it('defines the same colour tokens in light and dark', () => {
    const light = Object.keys(colourTokens(tokens(), ':root'))
    const dark = Object.keys(colourTokens(tokens(), "[data-theme='dark']"))

    expect(light.filter((t) => !dark.includes(t))).toEqual([])
    expect(dark.filter((t) => !light.includes(t))).toEqual([])
  })

  it('exposes every colour token to Tailwind through @theme inline', () => {
    const css = tokens()
    const exposed = new Set(
      [...css.matchAll(/--color-[\w-]+:\s*var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]),
    )
    const unexposed = Object.keys(colourTokens(css, ':root')).filter((t) => !exposed.has(t))

    expect(unexposed).toEqual([])
  })

  it('never exposes a token :root does not define', () => {
    // `@theme inline` maps `--color-x: var(--x)`. A var() naming a token that was renamed
    // or deleted compiles to nothing, and the utility silently stops painting.
    const css = tokens()
    const defined = new Set(Object.keys(cssBlock(css, ':root')))
    const referenced = Object.values(cssBlock(css, '@theme inline')).flatMap((v) =>
      [...v.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]),
    )

    expect(referenced.length).toBeGreaterThan(20)
    expect(referenced.filter((t) => !defined.has(t))).toEqual([])
  })

  it('writes every colour as a hex literal', () => {
    const css = tokens()
    const fnColours = [...css.matchAll(/\b(?:rgba?|hsla?|oklch|lab|lch)\s*\(/g)].map((m) => m[0])

    expect(fnColours).toEqual([])
    expect(Object.keys(colourTokens(css, ':root')).length).toBeGreaterThan(20)
  })
})
