// Proof that theme-guard can go RED — and, just as importantly, that it stays GREEN on
// the two things that have made this guard untrustworthy before: an issue number in
// prose, and a `//` inside a string.
//
// These live as tests rather than a one-off manual check so that whoever next edits the
// regexes finds out immediately what they broke.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { isExcluded, scanSource } from '../../scripts/theme-guard.mjs'

type Violation = { file: string; line: number; name: string; text: string }

const scan = (src: string, file = 'src/components/Probe/index.tsx'): Violation[] =>
  scanSource(file, src) as Violation[]

const GUARD = join(process.cwd(), 'scripts', 'theme-guard.mjs')

describe('theme-guard', () => {
  it('case 1: flags a hex colour in a className, on the right line', () => {
    const found = scan(
      ['export const Probe = () => (', '  <div className="text-[#ff0000]">hi</div>', ')'].join(
        '\n',
      ),
    )

    expect(found).toHaveLength(1)
    expect(found[0].name).toBe('hex-colour')
    expect(found[0].text).toBe('#ff0000')
    expect(found[0].line).toBe(2)
  })

  it('case 2: flags a raw colour function in a style object and in CSS', () => {
    expect(scan('const s = { color: rgb(255, 0, 0) }')[0].name).toBe('raw-colour-fn')
    expect(scan('.x { color: rgba(0,0,0,.5); }', 'src/x.css')[0].name).toBe('raw-colour-fn')
    expect(scan('.x { color: hsl(0 0% 0%); }', 'src/x.css')[0].name).toBe('raw-colour-fn')
  })

  it('case 3: flags a built-in Tailwind palette class, including under a variant', () => {
    expect(scan('<p className="text-gray-500" />')[0].text).toBe('text-gray-500')
    expect(scan('<p className="hover:bg-slate-900" />')[0].text).toBe('bg-slate-900')
    expect(scan('<p className="dark:border-rose-50" />')[0].text).toBe('border-rose-50')
  })

  it('case 4: does NOT flag an issue number in prose — the reason comments are stripped', () => {
    expect(scan('// see the archive-block leak (#104) for background')).toEqual([])
    expect(scan('/* fixed in (#104), follow-up in (#abc) */')).toEqual([])
    expect(scan('.x { /* ticket (#104) */ color: var(--foreground); }', 'src/x.css')).toEqual([])
  })

  it('case 5: DOES flag a hex inside a real string — a colour in a string is still a colour', () => {
    const found = scan(`const brand = '#0a0a0a'`)
    expect(found).toHaveLength(1)
    expect(found[0].text).toBe('#0a0a0a')
  })

  it('case 6: a URL earlier on the line does not blind the rest of it', () => {
    const found = scan(`const a = 'https://example.com'; const b = '#ff0000'`)
    expect(found.map((v) => v.text)).toEqual(['#ff0000'])
  })

  it('case 6b: a base64 data URI containing // does not blind the rest of the file', () => {
    const found = scan(
      [
        `const blur = 'data:image/png;base64,iVBORw0KGgo//AAANSUhEUgAA'`,
        `const bad = '#123456'`,
      ].join('\n'),
    )
    expect(found.map((v) => v.line)).toEqual([2])
  })

  it('case 7: theme-guard-ignore on the line suppresses it', () => {
    expect(scan(`const brand = '#1DA1F2' // theme-guard-ignore: third-party brand`)).toEqual([])
  })

  it('case 8: excluded paths are excluded, and nothing else is', () => {
    expect(isExcluded('src/app/(frontend)/globals.css')).toBe(true)
    expect(isExcluded('src/app/(payload)/admin/importMap.js')).toBe(true)
    expect(isExcluded('src/payload-types.ts')).toBe(true)

    expect(isExcluded('src/blocks/Form/Error/index.tsx')).toBe(false)
    expect(isExcluded('src/app/(frontend)/layout.tsx')).toBe(false)
    // A near-miss must not slip through a prefix match.
    expect(isExcluded('src/app/(frontend)/globals.css.bak')).toBe(false)
  })

  it('case 9: the guard exits non-zero on a violation and zero on a clean tree', () => {
    // Clean tree: the real repo, which must stay green.
    const ok = execFileSync('node', [GUARD], { encoding: 'utf8' })
    expect(ok).toContain('0 violations')

    // Dirty tree: a throwaway file planted under src/, then removed.
    const dir = mkdtempSync(join(tmpdir(), 'theme-guard-'))
    const planted = join(process.cwd(), 'src', `__theme_guard_probe__.tsx`)
    try {
      writeFileSync(planted, 'export const P = () => <i className="text-gray-500" />\n')
      let code = 0
      let output = ''
      try {
        execFileSync('node', [GUARD], { encoding: 'utf8', stdio: 'pipe' })
      } catch (err) {
        const e = err as { status: number; stderr: string }
        code = e.status
        output = e.stderr
      }
      expect(code).toBe(1)
      expect(output).toContain('__theme_guard_probe__.tsx:1')
      expect(output).toContain('tailwind-palette')
    } finally {
      rmSync(planted, { force: true })
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('does not mistake non-colour hex-ish runs for colours', () => {
    expect(scan(`const a = '#12345'`)).toEqual([]) // 5 digits is not a colour
    expect(scan(`const a = '#abcdefgh'`)).toEqual([]) // not a hex run at all
    expect(scan(`const u = 'https://x.dev/q#defaultpopulate'`)).toEqual([])
  })

  it('reports the correct line after a multi-line block comment', () => {
    const found = scan(
      ['/*', ' * a long comment', ' * with (#104) inside', ' */', `const c = '#abc'`].join('\n'),
    )
    expect(found).toHaveLength(1)
    expect(found[0].line).toBe(5)
  })

  it('a lone apostrophe in a comment does not swallow the rest of the file', () => {
    const found = scan(["// don’t worry — actually: don't", `const c = '#abc'`].join('\n'))
    expect(found.map((v) => v.line)).toEqual([2])
  })
})
