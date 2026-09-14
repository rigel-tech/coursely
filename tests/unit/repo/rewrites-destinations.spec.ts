// Every public URL on this site is a Vietnamese path that `rewrites.ts` maps onto an
// English-named folder. The two sides are joined by a string, and nothing checks that the
// string still points at anything: rename the folder and the build stays green, the types
// stay green, and the page 404s the first time somebody opens it.
//
// This walks the map and demands a real page file at the other end.

import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { rewrites } from '@/../rewrites'

const APP = 'src/app/(frontend)'

/** `/student/login` → the folder that must hold its page; `:slug` segments match any folder. */
const pageFileFor = (destination: string): string =>
  `${APP}${destination.replace(/\/:[^/]+/g, '')}/page.tsx`

describe('every rewrite destination is a real page', () => {
  it('resolves each one to a page.tsx on disk', async () => {
    // `rewrites` may return a flat list or the three-phase object; this project uses the list.
    const rules = await rewrites!()
    if (!Array.isArray(rules)) throw new Error('rewrites() no longer returns a flat list')

    expect(rules.length).toBeGreaterThan(0)
    expect(rules.filter((rule) => !existsSync(pageFileFor(rule.destination)))).toEqual([])
  })
})
