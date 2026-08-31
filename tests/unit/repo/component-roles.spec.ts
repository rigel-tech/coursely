// A token can be defined, documented, exposed to Tailwind — and still be the wrong one for
// the job, or nobody's job at all. `theme-guard` cannot tell: it only asks whether a colour
// was hardcoded, never whether the role picked was right.
//
// Both failures here are silent. A component that reaches for `--primary` where the design
// says `--link` renders a perfectly good colour that happens to be unreadable in dark mode,
// because `--primary` is deliberately identical in both themes and `--link` is not. A role
// nothing paints with renders nothing at all.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const TOKENS = 'src/app/(frontend)/globals.css'
const BUTTON = 'src/components/public/ui/button.tsx'
const CONFIG = 'tailwind.config.mjs'

/** Custom properties with a literal hex value, declared directly in one block. */
const rolesIn = (selector: string): Record<string, string> => {
  const css = readFileSync(TOKENS, 'utf8')
  const start = css.indexOf(`${selector} {`)
  const end = css.indexOf('\n}', start)
  if (start < 0 || end < 0) throw new Error(`${TOKENS} has no \`${selector}\` block`)

  return Object.fromEntries(
    [...css.slice(start, end).matchAll(/^\s*--([\w-]+):\s*(#[0-9a-fA-F]{6});/gm)].map((m) => [
      m[1],
      m[2],
    ]),
  )
}

const themes = (): Record<string, Record<string, string>> => ({
  light: rolesIn(':root'),
  dark: rolesIn("[data-theme='dark']"),
})

/** WCAG 2.1 relative luminance. */
const luminance = (hex: string): number => {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

const contrast = (a: string, b: string): number => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Foreground/background pairs the components genuinely put together.
 *
 * `--primary` is absent as a *foreground*: it is a surface role (`bg-primary`), it is
 * deliberately the same blue in both themes, and against the dark page background it sits
 * at 2.75:1. Text that looks like a link takes `--link`, which does flip. Adding the pair
 * here instead of fixing the callers would force the brand blue to change.
 */
const PAIRS: readonly [string, string][] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['foreground', 'muted'],
  ['foreground', 'secondary'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'],
  ['muted-foreground-subtle', 'background'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['brand-accent-foreground', 'brand-accent'],
  ['destructive-foreground', 'destructive'],
  ['success-foreground', 'success'],
  ['warning-foreground', 'warning'],
  ['error-foreground', 'error'],
  ['link', 'background'],
  ['link', 'card'],
  ['heading-accent', 'background'],
  ['heading-accent', 'card'],
]

const AA = 4.5

describe('every role pair the design relies on is readable', () => {
  it('meets WCAG AA in both themes', () => {
    const failures: string[] = []
    for (const [themeName, roles] of Object.entries(themes())) {
      for (const [fg, bg] of PAIRS) {
        if (!roles[fg] || !roles[bg]) {
          failures.push(`${themeName}: ${fg} or ${bg} is not defined`)
          continue
        }
        const ratio = contrast(roles[fg], roles[bg])
        if (ratio < AA) {
          failures.push(`${themeName}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${AA}`)
        }
      }
    }

    expect(PAIRS.length).toBeGreaterThan(15)
    expect(failures).toEqual([])
  })
})

describe('components take the role the design assigns', () => {
  it("styles the button's link variant with --link, never --primary", () => {
    // `--primary` does not change between themes by design; `--link` does. A link painted
    // with primary is 2.75:1 on the dark page background, and the header nav uses exactly
    // this variant.
    const src = readFileSync(BUTTON, 'utf8')
    const variant = /link:\s*'([^']*)'/.exec(src)?.[1]

    expect(variant).toBeTruthy()
    expect(variant).toContain('text-link')
    expect(variant).not.toContain('text-primary')
  })
})

describe('no colour role is defined without a consumer', () => {
  const sources = (): string => {
    const files: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.(tsx?|mjs|css)$/.test(entry.name)) files.push(full)
      }
    }
    walk('src')

    return [...files.filter((f) => !f.endsWith('globals.css')), CONFIG]
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n')
  }

  it('paints with every role it declares', () => {
    // A role is consumed either as a Tailwind utility (`bg-card`) or through `var(--card)`
    // — the prose mappings in tailwind.config.mjs use the second form.
    const src = sources()
    const orphaned = Object.keys(rolesIn(':root')).filter((role) => {
      const utility = new RegExp(
        `(?:bg|text|border|ring|fill|stroke|outline|decoration|from|via|to|shadow)-${role}(?![\\w-])`,
      )
      return !utility.test(src) && !new RegExp(`var\\(--${role}(?![\\w-])`).test(src)
    })

    expect(Object.keys(rolesIn(':root')).length).toBeGreaterThan(20)
    expect(orphaned).toEqual([])
  })
})
