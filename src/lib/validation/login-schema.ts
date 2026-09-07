/**
 * Zod schema + FormData adapter for login (§7).
 *
 * `parseLoginInput` takes the raw string bag from a `FormData`. `email` / `password`
 * are the only validated fields — a bad one yields a generic `fieldErrors` entry,
 * never "which" was wrong. `callbackUrl` is kept only when it is a same-site
 * absolute path (`/...`, not `//...`), so a crafted value can never drive an open
 * redirect.
 */
import { z } from 'zod'

const schema = z.object({
  email: z.email('Email hoặc mật khẩu không đúng.'),
  password: z.string().min(1, 'Email hoặc mật khẩu không đúng.'),
})

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>

export type LoginInput = {
  email: string
  password: string
  callbackUrl?: string
}

export type LoginParseResult =
  { success: true; data: LoginInput } | { success: false; fieldErrors: LoginFieldErrors }

/** A same-site path we are willing to redirect to, or `undefined`. */
export function safeCallbackUrl(raw: unknown): string | undefined {
  return typeof raw === 'string' && /^\/(?!\/)/.test(raw) ? raw : undefined
}

export function parseLoginInput(raw: Record<string, unknown>): LoginParseResult {
  const parsed = schema.safeParse({ email: raw.email, password: raw.password })
  if (!parsed.success) {
    const fieldErrors: LoginFieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (key === 'email' || key === 'password') fieldErrors[key] = issue.message
    }
    return { success: false, fieldErrors }
  }

  return {
    success: true,
    data: {
      email: parsed.data.email,
      password: parsed.data.password,
      callbackUrl: safeCallbackUrl(raw.callbackUrl),
    },
  }
}
