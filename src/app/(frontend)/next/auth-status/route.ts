/**
 * `GET /next/auth-status` → `{ authenticated: boolean, user?: { id: number, name: string, email?: string } }`.
 *
 * Exists so the public header can learn whether the browser has an active public-site
 * session and retrieve the current student user's profile info (fullName, email)
 * without a Server Component reading `headers()` / `cookies()`: the header's
 * host pages are `force-static`, which blanks those APIs.
 *
 * Anything short of a resolvable student — no cookie, a bad token, an account that
 * is gone — reports `authenticated: false`. The header then offers sign-in, which is
 * the only action that can help.
 */
import { getSessionStudent } from '@/lib/auth/session-student'

export async function GET(): Promise<Response> {
  const student = await getSessionStudent()

  if (!student) {
    return Response.json({ authenticated: false })
  }

  const displayName =
    student.fullName?.trim() || (student.email ? student.email.split('@')[0] : 'Tài khoản')

  return Response.json({
    authenticated: true,
    user: {
      id: student.id,
      name: displayName,
      email: student.email,
    },
  })
}
