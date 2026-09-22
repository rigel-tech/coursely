// `proxy` is no longer the only place a student session gets renewed, and once its matcher
// narrows to the guarded paths it will not run on `/` or `/khoa-hoc` at all. Every scope that
// *may* write cookies — Route Handlers and Server Actions — must therefore go through
// `ensureSessionStudent`, the reader that renews, rather than `getSessionStudent`, the one
// that only reads.
//
// Picking the wrong one breaks silently and late: the code compiles, every existing test
// stays green, and the failure is a student whose access token lapsed after fifteen minutes
// of browsing being told to sign in again while a refresh token good for thirty days sits
// in the same jar. Nothing logs it. A fifth action added next month is exactly where this
// would come back, which is why this is a scan and not a test of any one caller.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Directories whose files run in a cookie-writable scope. */
const RENEWING_SCOPES = ['src/actions/student', 'src/app/(frontend)/next']

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (/\.tsx?$/.test(name)) acc.push(path.split(sep).join('/'))
  }
  return acc
}

const files = RENEWING_SCOPES.flatMap((dir) => walk(dir))

/** Names `getSessionStudent` in an import from the session module. */
const importsReadOnlyReader = (file: string): boolean => {
  const src = readFileSync(file, 'utf8')
  return /import\s*\{[^}]*\bgetSessionStudent\b[^}]*\}\s*from\s*['"][^'"]*session-student['"]/.test(
    src,
  )
}

describe('who reads the session in a cookie-writable scope', () => {
  it('finds files at all (an empty scan would pass forever)', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('leaves no Server Action or Route Handler on the read-only reader', () => {
    expect(files.filter(importsReadOnlyReader)).toEqual([])
  })

  it('has at least one caller on the renewing reader, so the scan is proving something', () => {
    const renewing = files.filter((file) =>
      /\bensureSessionStudent\b/.test(readFileSync(file, 'utf8')),
    )

    expect(renewing.length).toBeGreaterThan(0)
  })
})
