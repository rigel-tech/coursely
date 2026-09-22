// `config.matcher` in `src/proxy.ts` decides which requests reach the auth guard at all.
// Next requires its values to be literal constants — an imported variable is silently
// ignored — so the list duplicates `PROTECTED_PREFIXES` and `AUTH_PREFIXES`, and only a
// test can keep the copies honest.
//
// Two silent failures live here, in opposite directions:
//
//   too narrow — a guarded path drops out of the matcher, `proxy` never runs for it, and
//                the page is served to anyone. Nothing errors; the page renders.
//   too wide   — a public path creeps back in, and every visit to `/` or `/khoa-hoc` goes
//                through the guard again, re-minting session cookies onto cacheable page
//                responses. That is the shape of BUG-08.
//
// The sources are compiled with Next's own `tryToParsePath`, the function
// `getMiddlewareMatchers` uses (`next/dist/build/analysis/get-page-static-info.js`), rather
// than a hand-rolled approximation — the point of this file is what Next will actually do.
//
// Watch the bare-prefix trap. `next/dist/docs/.../proxy.md` claims a source is "anchored to
// the start of the path: `/about` matches `/about` and `/about/team`". It does not:
// `/about` compiles to `^\/about[\/#\?]?$`. Writing the prefix without `/:path*` leaves
// every subpath of a protected page ungated, with nothing to show for it.

import { describe, expect, it } from 'vitest'

import { PROTECTED_PREFIXES, AUTH_PREFIXES } from '@/lib/constants/auth'
import { config } from '@/proxy'

const { tryToParsePath } = await import('next/dist/lib/try-to-parse-path.js')

const sources = (): string[] => {
  const { matcher } = config
  return Array.isArray(matcher) ? matcher : [matcher]
}

const matchers = sources().map((source) => {
  const { regexStr } = tryToParsePath(source)
  if (!regexStr) throw new Error(`matcher source does not compile: ${source}`)
  return { source, re: new RegExp(regexStr) }
})

const matches = (pathname: string): boolean => matchers.some(({ re }) => re.test(pathname))

/** The prefix a matcher source guards, with the `/:path*` tail taken off. */
const prefixOf = (source: string): string => source.replace(/\/:path\*$/, '')

const GUARDED = [...PROTECTED_PREFIXES, ...AUTH_PREFIXES]

// Paths that must stay off the guard entirely. `/admin` is here deliberately: Payload's own
// `canAccessAdmin` guards the panel on every request, and `decideRoute` has never routed it.
const PUBLIC_PATHS = [
  '/',
  '/khoa-hoc',
  '/khoa-hoc/lap-trinh-web',
  '/courses',
  '/courses/lap-trinh-web',
  '/posts',
  '/posts/bai-viet-mau',
  '/search',
  '/admin',
  '/admin/collections/students',
  '/next/auth-status',
  '/next/notifications-count',
]

describe('proxy matcher — every guarded prefix is covered', () => {
  it('compiles every source through Next’s own parser', () => {
    expect(matchers.length).toBeGreaterThan(0)
  })

  it.each(PROTECTED_PREFIXES)('guards %s, bare and with a subpath', (prefix) => {
    expect(matches(prefix)).toBe(true)
    expect(matches(`${prefix}/doi-mat-khau`)).toBe(true)
    expect(matches(`${prefix}/a/b`)).toBe(true)
  })

  it.each(AUTH_PREFIXES)('guards %s, bare and with a subpath', (prefix) => {
    expect(matches(prefix)).toBe(true)
    expect(matches(`${prefix}/buoc-2`)).toBe(true)
    expect(matches(`${prefix}/a/b`)).toBe(true)
  })
})

describe('proxy matcher — public pages never reach the guard', () => {
  it.each(PUBLIC_PATHS)('leaves %s alone', (pathname) => {
    expect(matches(pathname)).toBe(false)
  })
})

describe('proxy matcher — the two lists stay in sync', () => {
  it('has no source outside PROTECTED_PREFIXES and AUTH_PREFIXES', () => {
    const stray = sources()
      .map(prefixOf)
      .filter((prefix) => !GUARDED.includes(prefix as (typeof GUARDED)[number]))

    expect(stray).toEqual([])
  })

  it('has a source for every guarded prefix', () => {
    const covered = sources().map(prefixOf)

    expect([...GUARDED].sort()).toEqual([...covered].sort())
  })
})
