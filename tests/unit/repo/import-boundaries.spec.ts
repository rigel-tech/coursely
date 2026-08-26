// Playwright drives the app over HTTP. Nothing it loads may import the app.
//
// `next` ships no `exports` map, so `next/cache` — which the collection hooks import, as
// Next intends — resolves only under a bundler. Vite manages it, plain Node ESM does not.
// The moment anything under tests/e2e reaches src/payload.config, that chain hits
// `next/cache` and Playwright dies during *discovery*: `0 tests in 0 files`, no failing
// test, nothing that looks like a broken assertion.
//
// This asserts a static fact about the source tree, so it needs no browser and no server
// and belongs in unit/, whatever it happens to be looking at.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const E2E_DIR = 'tests/e2e'

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (/\.tsx?$/.test(name)) acc.push(path.split('\\').join('/'))
  }
  return acc
}

const APP_ENTRY = /['"][^'"]*(payload\.config|src\/collections|src\/payload-types)/

const importsTheApp = (file: string): boolean =>
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .some((line) => /^\s*import\b/.test(line) && APP_ENTRY.test(line))

describe('import boundaries', () => {
  it('nothing Playwright loads imports the Payload config', () => {
    expect(walk(E2E_DIR).filter(importsTheApp)).toEqual([])
  })

  it('finds the files at all (an empty scan would pass forever)', () => {
    const files = walk(E2E_DIR)

    expect(files.some((f) => f.endsWith('.spec.ts'))).toBe(true)
    // Helpers live under tests/e2e too, which is the point: one directory, one rule.
    expect(files.some((f) => f.includes('/helpers/'))).toBe(true)
  })
})
