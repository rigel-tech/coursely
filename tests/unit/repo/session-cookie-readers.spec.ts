// Completion condition 6 of E-04: exactly one place in `src/` answers "which student
// is signed in" on the server.
//
// The pattern this replaced — `cookies()` → `verifyAccessToken` → `findByID` — was copied
// into three files. Copies drift: one gains a status check the others lack, one keeps
// reading a stale collection after a rename, and nothing fails until a user notices they
// are signed in on one page and out on the next. A count is the only thing that catches a
// fourth copy being added.
//
// `src/proxy.ts` is the documented exception. It reads the same cookie from
// `request.cookies` (Proxy has no `next/headers` request scope), so it never matches the
// `next/headers` half of this check — and if it ever did, that would be the bug.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = 'src'
const HELPER = 'src/lib/auth/student-session.ts'

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (/\.tsx?$/.test(name)) acc.push(path.split('\\').join('/'))
  }
  return acc
}

/** Reads the student access cookie out of the `next/headers` request scope. */
const readsAccessCookieFromHeaders = (file: string): boolean => {
  const src = readFileSync(file, 'utf8')
  return /from ['"]next\/headers['"]/.test(src) && src.includes('ACCESS_TOKEN_COOKIE')
}

describe('who may read the student access cookie', () => {
  const readers = walk(SRC).filter(readsAccessCookieFromHeaders)

  it('is exactly one file, and it is getStudentSession', () => {
    expect(readers).toEqual([HELPER])
  })

  it('finds files at all (an empty scan would pass forever)', () => {
    expect(walk(SRC).length).toBeGreaterThan(50)
  })

  it('leaves proxy.ts out of it — it reads request.cookies, a different surface', () => {
    const proxy = readFileSync('src/proxy.ts', 'utf8')

    expect(proxy).toContain('ACCESS_TOKEN_COOKIE')
    expect(proxy).toContain('request.cookies.get(ACCESS_TOKEN_COOKIE)')
    expect(proxy).not.toMatch(/from ['"]next\/headers['"]/)
  })
})
