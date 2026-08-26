// A shebang plus CRLF is a broken file that every tool disagrees about: git reports it
// unmodified, tsc and esbuild parse it, plain node runs it — and Vite's transform throws
// `SyntaxError: Invalid or unexpected token` with no file and no line number.
//
// core.autocrlf is on for Windows clones, so this arrives on checkout rather than from
// anything anyone typed. .gitattributes is the fix; this is the alarm if it regresses.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const trackedFiles = (): string[] =>
  execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)

const readIfText = (file: string): string | null => {
  try {
    const buf = readFileSync(file)
    // Skip binaries: a NUL byte in the first 8kB is the usual heuristic.
    if (buf.subarray(0, 8192).includes(0)) return null
    return buf.toString('utf8')
  } catch {
    return null
  }
}

describe('line endings', () => {
  it('no file starting with a shebang contains CRLF', () => {
    const offenders = trackedFiles().filter((file) => {
      const text = readIfText(file)
      return text !== null && text.startsWith('#!') && text.includes('\r\n')
    })

    expect(offenders).toEqual([])
  })

  it('finds the shebang files at all (guards against an empty scan passing)', () => {
    const withShebang = trackedFiles().filter((file) => {
      const text = readIfText(file)
      return text !== null && text.startsWith('#!')
    })

    expect(withShebang.length).toBeGreaterThan(0)
  })
})
