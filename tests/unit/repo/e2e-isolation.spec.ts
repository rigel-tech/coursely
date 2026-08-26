// e2e talks to the running app over HTTP. It must not import the app.
//
// `next` ships no `exports` map, so `next/cache` — which the collection hooks import, as
// Next intends — only resolves under a bundler. Vite manages it, plain Node ESM does not.
// The moment anything under tests/e2e or tests/helpers pulls in src/payload.config, that
// import chain reaches `next/cache` and Playwright dies during *discovery*: `0 tests in
// 0 files`, no failing test, nothing that looks like a broken assertion.

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

const APP_ENTRY = /['"][^'"]*(payload\.config|src\/collections|src\/payload-types)/

describe('e2e isolation', () => {
  it('nothing Playwright loads imports the Payload config', () => {
    const offenders = [...walk('tests/e2e'), ...walk('tests/helpers')].filter((file) =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .some((line) => /^\s*import\b/.test(line) && APP_ENTRY.test(line)),
    )

    expect(offenders).toEqual([])
  })

  it('finds the files at all (an empty scan would pass forever)', () => {
    expect(walk('tests/e2e').length).toBeGreaterThan(0)
    expect(walk('tests/helpers').length).toBeGreaterThan(0)
  })
})
