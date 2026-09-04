/**
 * `GET /next/auth-status` → `{ authenticated: boolean }`.
 *
 * Exists so the public header can learn whether the browser has an active public-site
 * session without a Server Component reading `headers()` / `cookies()`: the header's
 * host pages (`src/app/(frontend)/page.tsx`, `courses/`, `posts/`) are `force-static`,
 * which blanks those APIs. `HeaderAuthControls` calls this after hydration.
 *
 * Signature check only — no Redis, no Payload, no cookie mutation. If the access token
 * is expired but a valid refresh cookie exists, this still returns `false`; `proxy`
 * performs the actual renewal on the next navigation. See
 * `specs/002-header-logout-ui/contracts/auth-status-endpoint.md`.
 */
import { cookies } from 'next/headers'

import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth'
import { verifyAccessToken } from '@/lib/auth/access-token'

export async function GET(): Promise<Response> {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value
  return Response.json({ authenticated: verifyAccessToken(token) !== null })
}
