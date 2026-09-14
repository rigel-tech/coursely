import { describe, expect, it } from 'vitest'

import { PROTECTED_PREFIXES } from '@/lib/constants/auth'
import { rewrites } from '../../../rewrites'

/**
 * `rewrites.ts` gives some pages a public Vietnamese URL on top of the English folder
 * they live in. A rewrite *adds* a name, it does not take the old one away, so both paths
 * reach the app — and `proxy` runs before the rewrite, so it sees whichever one the
 * browser asked for and nothing translates between them.
 *
 * That is the drift this file exists to catch: guarding only the public name leaves the
 * folder name open, and nothing anywhere errors. Today the page behind it guards itself,
 * so the gap costs nothing; the next protected page added this way is where it would.
 */
const asList = async () => {
  // `NextConfig['rewrites']` is optional in the type; this project always exports it.
  if (typeof rewrites !== 'function') throw new Error('rewrites.ts exports no rewrite function')

  const table = await rewrites()
  // The config accepts three shapes; this project uses the plain array.
  expect(Array.isArray(table)).toBe(true)
  return table as { source: string; destination: string }[]
}

const guards = (pathname: string) =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

describe('PROTECTED_PREFIXES against the rewrite table', () => {
  it('guards the destination of every rewrite whose source it guards', async () => {
    const unguarded = (await asList())
      .filter(({ source }) => guards(source))
      .filter(({ destination }) => !guards(destination))
      .map(({ source, destination }) => `${source} -> ${destination}`)

    expect(unguarded).toEqual([])
  })

  it('leaves the destination of an unguarded rewrite alone', async () => {
    // `/khoa-hoc` is a public catalogue. If guarding its source ever starts guarding
    // `/courses` by accident, the catalogue disappears for signed-out visitors.
    const overGuarded = (await asList())
      .filter(({ source }) => !guards(source))
      .filter(({ destination }) => guards(destination))
      .map(({ source, destination }) => `${source} -> ${destination}`)

    expect(overGuarded).toEqual([])
  })
})
