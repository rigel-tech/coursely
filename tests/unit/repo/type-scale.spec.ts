// The last scale to reach the page, and the one that hid the longest: `globals.css` declared
// no `--text-*` at all, so all 64 `text-*` classes in this project were silently taking
// Tailwind's default ladder — 12 / 14 / 16 / 18 / 20 / 24 / 30 — while DESIGN.md specified
// 11 / 12.5 / 14 / 15.5 / 18 / 22 / 30. Only `text-lg` happened to agree.
//
// Line height is the subtler half. Tailwind pairs every `--text-x` with its own
// `--text-x--line-height`, so declaring a size and omitting the ratio leaves text at the
// right size on the wrong rhythm — which reads as a spacing problem, not a token one.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DESIGN = 'DESIGN.md'
const TOKENS = 'src/app/(frontend)/globals.css'

/** `| `label-sm` | 11px | 1.4 | `text-xs` |` from the Typography scale table. */
type Step = { token: string; size: string; lineHeight: string; step: string }

const declaredScale = (): Step[] => {
  const doc = readFileSync(DESIGN, 'utf8')
  const start = doc.indexOf('### Scale')
  if (start < 0) throw new Error('DESIGN.md has no `### Scale` table under Typography')

  const section = doc.slice(start, doc.indexOf('\n## ', start + 1))
  return [
    ...section.matchAll(
      /^\|\s*`([\w-]+)`\s*\|\s*([^|]+?)\s*\|\s*([\d.]+)\s*\|\s*`text-([\w-]+)`\s*\|/gm,
    ),
  ].map((m) => ({ token: m[1], size: m[2], lineHeight: m[3], step: m[4] }))
}

/** Every `--text-*` custom property the token file declares, including the line-height half. */
const compiled = (): Record<string, string> => {
  const css = readFileSync(TOKENS, 'utf8')
  return Object.fromEntries(
    [...css.matchAll(/^\s*(--text-[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]),
  )
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

describe('the type scale is the one DESIGN.md declares', () => {
  it('compiles every step at the size the document gives it', () => {
    const scale = declaredScale()
    const css = compiled()
    const wrong = scale
      .filter(({ size, step }) => css[`--text-${step}`] !== size)
      .map(
        ({ size, step, token }) =>
          `${token} (text-${step}): DESIGN.md says ${size}, globals.css has ${css[`--text-${step}`] ?? '(unset)'}`,
      )

    expect(scale.length).toBeGreaterThan(6)
    expect(wrong).toEqual([])
  })

  it('gives every step its own line height', () => {
    // Tailwind keeps its default ratio for any size whose `--…--line-height` is missing, so
    // the text lands at the right size on the wrong rhythm and nothing reports it.
    const scale = declaredScale()
    const css = compiled()
    const wrong = scale
      .filter(({ lineHeight, step }) => css[`--text-${step}--line-height`] !== lineHeight)
      .map(
        ({ lineHeight, step, token }) =>
          `${token} (text-${step}): DESIGN.md says ${lineHeight}, globals.css has ${css[`--text-${step}--line-height`] ?? '(unset)'}`,
      )

    expect(wrong).toEqual([])
  })
})

describe('components stay inside the type scale', () => {
  it('uses no text size the document does not declare', () => {
    const declared = new Set(declaredScale().map((s) => s.step))
    // Sizes only. `text-muted-foreground` and friends are colour roles sharing the prefix.
    const SIZE_LIKE = /\btext-(xs|sm|base|md|lg|xl|\d+xl)(?![\w-])/g

    const strays: string[] = []
    for (const { file, source } of componentSources()) {
      for (const m of source.matchAll(SIZE_LIKE)) {
        if (!declared.has(m[1])) strays.push(`${file}: text-${m[1]}`)
      }
    }

    expect(declared.size).toBeGreaterThan(6)
    expect([...new Set(strays)]).toEqual([])
  })
})
