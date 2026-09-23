/**
 * `GET /next/course-status?courseId=N` →
 * `{ authenticated: boolean, profile?: { email, fullName, phone }, enrollment?: { id, enrollmentStatus, canCancel } }`.
 *
 * Exists so `/khoa-hoc/:slug` can stop reading the session on the server. That read made the
 * page dynamic — `cookies()` does — so every visit re-ran its Payload queries. The page was
 * the one documented exception to "auth-dependent public UI resolves signed-in state
 * client-side"; this route is what retires it.
 *
 * Renews the session as it reads it, like the two routes beside it, and every response is
 * `private, no-store`: the body is one student's profile and one student's enrollment. See
 * INVARIANTS.
 *
 * `courseId` comes off the query string, so it is client input. It is only ever used to scope
 * a lookup already scoped to the calling student, so a forged one cannot reach anyone else's
 * data — but it is validated anyway rather than passed to Payload as `NaN`.
 */
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { ensureSessionStudent } from '@/lib/auth/session-student'
import { getActiveEnrollmentStatus } from '@/services/student-enrollment'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get('courseId')
  const courseId = Number(raw)

  if (!raw || !Number.isInteger(courseId) || courseId <= 0) {
    return Response.json({ error: 'invalid courseId' }, { status: 400, headers: NO_STORE })
  }

  const student = await ensureSessionStudent()
  if (!student) {
    return Response.json({ authenticated: false }, { headers: NO_STORE })
  }

  const payload = await getPayload({ config: configPromise })
  const enrollment = await getActiveEnrollmentStatus(payload, student.id, courseId)

  return Response.json(
    {
      authenticated: true,
      profile: { email: student.email, fullName: student.fullName, phone: student.phone },
      ...(enrollment ? { enrollment } : {}),
    },
    { headers: NO_STORE },
  )
}
