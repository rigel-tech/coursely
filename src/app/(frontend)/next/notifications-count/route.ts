/**
 * `GET /next/notifications-count` → `{ count: number }`.
 *
 * Mirrors `/next/auth-status`: exists so the public header can poll a signed-in student's
 * unread notification count without a Server Component reading `headers()` / `cookies()`
 * — the header's host pages are `force-static`, which blanks those APIs. Safe to call every
 * 5 seconds.
 *
 * Renews the session as it reads it, the same way `/next/auth-status` does — the bell polls
 * this every few seconds, so it is a second place a lapsed access token gets re-minted.
 *
 * Anything short of a resolvable student reports `count: 0` — there is nothing to show,
 * not an error. Every response is `private, no-store`, unconditionally: the count is one
 * student's, so no case here is shareable. See INVARIANTS.
 */
import { ensureSessionStudent } from '@/lib/auth/session-student'
import { countUnreadNotifications } from '@/services/student-notifications'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function GET(): Promise<Response> {
  const student = await ensureSessionStudent()

  if (!student) {
    return Response.json({ count: 0 }, { headers: NO_STORE })
  }

  const count = await countUnreadNotifications(student.id)
  return Response.json({ count }, { headers: NO_STORE })
}
