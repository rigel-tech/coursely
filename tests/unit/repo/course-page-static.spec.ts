// `/khoa-hoc/:slug` was the one place a public page read the session on the server, and that
// read is what kept it on `force-dynamic`: `cookies()` makes a route dynamic, so the page
// was re-rendered, with its Payload queries, on every single visit.
//
// Both halves have to stay gone together, and each breaks silently on its own:
//
//   a session read creeps back  — the page still renders, correctly, and simply stops being
//                                 cacheable. Nothing errors; the only symptom is latency.
//   force-dynamic creeps back   — same, in one line, and it reads like a deliberate choice.
//
// The page's own banner and the INVARIANTS entry say the rule; this is what notices.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PAGE = 'src/app/(frontend)/courses/[slug]/page.tsx'

const source = readFileSync(PAGE, 'utf8')

describe('the course detail page stays cacheable', () => {
  it('reads the file at all (an empty read would pass forever)', () => {
    expect(source).toContain('CourseDetailPage')
  })

  it('reads no session on the server', () => {
    expect(source).not.toMatch(/\bgetSessionStudent\b/)
    expect(source).not.toMatch(/\bensureSessionStudent\b/)
  })

  it('reaches for no per-request cookie or header API', () => {
    // `draftMode()` is deliberately not in this list: reading `isEnabled` does not opt a
    // route out of static rendering — only `enable()` / `disable()` do. See INVARIANTS.
    expect(source).not.toMatch(/\bcookies\(\)/)
    expect(source).not.toMatch(/\bheaders\(\)/)
  })

  it('does not declare force-dynamic', () => {
    expect(source).not.toMatch(/dynamic\s*=\s*['"]force-dynamic['"]/)
  })

  // No `revalidate` case here on purpose. The window was dropped deliberately, which leaves
  // the route on Next's default of `false` — cached until something calls `revalidatePath`.
  // Asserting a window again would fail a page that is the way it is meant to be.

  it('leaves the enrollment lookup to the client status route', () => {
    expect(source).not.toMatch(/\bgetActiveEnrollmentStatus\b/)
  })
})
