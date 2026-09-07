/**
 * Zod schema + FormData adapter for login (§7).
 *
 * `parseLoginInput` takes the raw string bag from a `FormData`. `email` / `password`
 * are the only validated fields — a bad one yields a generic `fieldErrors` entry,
 * never "which" was wrong. `rememberMe` is a checkbox (`'on'` when ticked).
 * `callbackUrl` is kept only when it is a same-site absolute path (`/...`, not
 * `//...`), so a crafted value can never drive an open redirect.
 */
import { z } from 'zod'

const schema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>

export type LoginInput = {
  email: string
  password: string
  rememberMe: boolean
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

  const rememberMe = raw.rememberMe === 'on' || raw.rememberMe === 'true' || raw.rememberMe === true

  return {
    success: true,
    data: {
      email: parsed.data.email,
      password: parsed.data.password,
      rememberMe,
      callbackUrl: safeCallbackUrl(raw.callbackUrl),
    },
  }
}
