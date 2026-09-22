/**
 * `GET /next/auth-status` → `{ authenticated: boolean, user?: { id: number, name: string, email?: string } }`.
 *
 * Renews the session as it reads it, which is what keeps a student signed in once `proxy`
 * stops running on public pages: this route is fetched on every page load, so it is where a
 * lapsed access token gets re-minted.
 *
 * Exists so the public header can learn whether the browser has an active public-site
 * session and retrieve the current student user's profile info (fullName, email)
 * without a Server Component reading `headers()` / `cookies()`: the header's
 * host pages are `force-static`, which blanks those APIs.
 *
 * Anything short of a resolvable student — no cookie, a bad token, an account that
 * is gone — reports `authenticated: false`. The header then offers sign-in, which is
 * the only action that can help.
 *
 * Every response is `private, no-store`, unconditionally: this body is one student's, so no
 * case here is shareable, and a header that depended on whether a cookie happened to be
 * written is one more thing to get wrong. See INVARIANTS.
 */
import { ensureSessionStudent } from '@/lib/auth/session-student'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

export async function GET(): Promise<Response> {
  const student = await ensureSessionStudent()

  if (!student) {
    return Response.json({ authenticated: false }, { headers: NO_STORE })
  }

  const displayName =
    student.fullName?.trim() || (student.email ? student.email.split('@')[0] : 'Tài khoản')

  return Response.json(
    {
      authenticated: true,
      user: {
        id: student.id,
        name: displayName,
        email: student.email,
      },
    },
    { headers: NO_STORE },
  )
}
