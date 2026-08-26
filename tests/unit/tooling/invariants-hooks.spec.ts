// The Stop hook only watches the files INVARIANTS.md points at, so this function decides
// what the hook can see at all. Get it wrong and the hook goes quiet in exactly the way
// that looks identical to having nothing to say.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { extractTrackedPaths } from '../../../.claude/hooks/invariants-lib.mjs'

const root = process.cwd()
const doc = readFileSync('INVARIANTS.md', 'utf8')
const tracked = (): Set<string> => extractTrackedPaths(doc, root) as Set<string>

describe('invariants stop hook — tracked paths', () => {
  it('watches every real file INVARIANTS.md points at, not only the ones under src/', () => {
    const paths = tracked()

    // Outside src/ and tests/. These are what the `var(--text)` fix touched, and the hook
    // stayed silent for them.
    expect(paths.has('tailwind.config.mjs')).toBe(true)
    expect(paths.has('scripts/theme-guard.mjs')).toBe(true)
  })

  it('still watches the src/ and tests/ paths', () => {
    const paths = tracked()

    expect(paths.has('src/collections/Posts/index.ts')).toBe(true)
    expect(paths.has('src/app/(frontend)/globals.css')).toBe(true)
    expect(paths.has('src/components/public/Card/index.tsx')).toBe(true)
  })

  it('ignores bare filenames written in prose', () => {
    const paths = tracked()

    // Both appear in INVARIANTS.md as shorthand inside a sentence. Neither is a path.
    expect(paths.has('importMap.js')).toBe(false)
    expect(paths.has('globals.css')).toBe(false)
  })

  it('ignores anything that does not exist on disk', () => {
    const paths = extractTrackedPaths(
      'See `src/does/not/exist.ts` and `package-lock.json` for details.',
      root,
    ) as Set<string>

    expect([...paths]).toEqual([])
  })

  it('resolves existence against the given root, not the process cwd', () => {
    const paths = extractTrackedPaths(
      'See `tailwind.config.mjs`.',
      '/nowhere-at-all',
    ) as Set<string>

    expect([...paths]).toEqual([])
  })
})
