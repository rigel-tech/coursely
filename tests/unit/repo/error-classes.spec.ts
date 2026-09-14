// Domain error classes are a contract between a service that throws and an action that
// catches, so they belong to neither. Left inside the module that throws them, the catching
// side has to import the thrower to name the error — which drags a service's whole
// dependency graph (Payload config included) into places that only wanted a class — and a
// unit test mocking that service loses the classes with it, so its `instanceof` branches
// quietly stop being the ones that ship.
//
// This file keeps them in one place. It scans rather than counts: a second home is the
// failure, not a second class.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = 'src'
const ERRORS_DIR = 'src/lib/errors/'

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (/\.tsx?$/.test(name)) acc.push(path.split('\\').join('/'))
  }
  return acc
}

/** `class Foo extends APIError` — Payload's base for anything thrown at an app boundary. */
const declaresAnErrorClass = (file: string): boolean =>
  /class\s+\w+\s+extends\s+APIError\b/.test(readFileSync(file, 'utf8'))

describe('where domain error classes live', () => {
  const files = walk(SRC)

  it('finds files at all — an empty scan would pass forever', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('is only under src/lib/errors/', () => {
    const strays = files.filter(declaresAnErrorClass).filter((f) => !f.startsWith(ERRORS_DIR))

    expect(strays).toEqual([])
  })

  it('is somewhere — the scan must actually be finding the classes', () => {
    expect(files.filter(declaresAnErrorClass).length).toBeGreaterThan(0)
  })
})

describe('the login service', () => {
  // Re-exporting them "for convenience" would leave two import paths alive for one class,
  // and `instanceof` is only ever as reliable as there being one of them.
  it('exports no error class of its own, not even a re-export', () => {
    const src = readFileSync('src/services/student-login.ts', 'utf8')

    expect(src).not.toMatch(/export\s+class\b/)
    expect(src).not.toMatch(/export\s*\{[^}]*(LoginRefused|EmailNotVerified)/)
  })
})
