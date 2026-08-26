// theme-guard cannot see this class of bug: a `var(--x)` naming a token that does not
// exist is not a hardcoded colour, so the guard stays green while the property silently
// falls back to whatever the vendor stylesheet decided.
//
// Scope is deliberately tailwind.config.mjs only. globals.css legitimately references
// variables injected at runtime — `--font-geist-mono` comes from next/font via the layout
// className — so scanning it would report those as dangling.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const TOKENS = 'src/app/(frontend)/globals.css'
const CONFIG = 'tailwind.config.mjs'

const definedTokens = (): Set<string> => {
  const css = readFileSync(TOKENS, 'utf8')
  return new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))
}

const referencedTokens = (): string[] => {
  const src = readFileSync(CONFIG, 'utf8')
  return [...src.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1])
}

describe('design tokens', () => {
  it('every token tailwind.config.mjs references is defined in globals.css', () => {
    const defined = definedTokens()
    const dangling = [...new Set(referencedTokens())].filter((t) => !defined.has(t))

    expect(dangling).toEqual([])
  })

  it('the token file actually defines tokens (guards against a bad regex)', () => {
    const defined = definedTokens()
    expect(defined.has('--foreground')).toBe(true)
    expect(defined.has('--background')).toBe(true)
    expect(defined.size).toBeGreaterThan(20)
  })
})
