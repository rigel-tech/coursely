// `'use server'` marks every exported async function in a file as a Server Action — a
// public, directly client-invokable RPC endpoint. `src/actions/` is exactly the set of
// files meant to be that; `src/services/` holds internal business logic called only from
// those action files (or from other server-side code), and was never meant to be reachable
// on its own. A `'use server'` left on a service file widens the app's public surface by
// accident: the service's functions become invokable endpoints nobody intended to expose,
// with none of the input validation an action file's own Zod schema would have applied.
//
// This scan is what keeps that mistake from recurring the day someone copy-pastes the
// directive into a new service file.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (/\.tsx?$/.test(name)) acc.push(path.split('\\').join('/'))
  }
  return acc
}

const declaresUseServer = (file: string): boolean =>
  /^\s*['"]use server['"]\s*$/m.test(readFileSync(file, 'utf8'))

describe("src/services/ never declares 'use server'", () => {
  const files = walk('src/services')

  it('finds no service file with the directive', () => {
    expect(files.filter(declaresUseServer)).toEqual([])
  })

  it('finds files at all (an empty scan would pass forever)', () => {
    expect(files.length).toBeGreaterThan(5)
  })
})

describe("src/actions/ always declares 'use server'", () => {
  const files = walk('src/actions')

  it('every action file has the directive', () => {
    expect(files.filter((f) => !declaresUseServer(f))).toEqual([])
  })

  it('finds files at all (an empty scan would pass forever)', () => {
    expect(files.length).toBeGreaterThan(5)
  })
})
