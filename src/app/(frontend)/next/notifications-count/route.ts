/**
 * `GET /next/notifications-count` → `{ count: number }`.
 *
 * Mirrors `/next/auth-status`: exists so the public header can poll a signed-in student's
 * unread notification count without a Server Component reading `headers()` / `cookies()`
 * — the header's host pages are `force-static`, which blanks those APIs. Pure read, no
 * side effect, safe to call every 60 seconds.
 *
 * Anything short of a resolvable student reports `count: 0` — there is nothing to show,
 * not an error.
 */
import { getSessionStudent } from '@/lib/auth/session-student'
import { countUnreadNotifications } from '@/services/student-notifications'

export async function GET(): Promise<Response> {
  const student = await getSessionStudent()

  if (!student) {
    return Response.json({ count: 0 })
  }

  const count = await countUnreadNotifications(student.id)
  return Response.json({ count })
}
