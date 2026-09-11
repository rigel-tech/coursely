/**
 * Zod schema for login (§7), used on both sides of the wire.
 *
 * `loginSchema` is what `<LoginForm>` validates against through `zodResolver`.
 * `loginInputSchema` adds the `callbackUrl` the client reads off the URL, and is what
 * `loginAction` re-checks — the only check that counts, since a caller can invoke the
 * action directly and never touch the form.
 *
 * `callbackUrl` is sanitised inside the schema rather than by the action, so there is no
 * path into `loginAction` that skips it. Both exported types are derived from these two
 * schemas; nothing here restates a field list by hand.
 *
 * There is no "remember me". Every session gets the same length — see
 * `REFRESH_TTL_SEC` in `lib/constants/auth.ts`.
 */
import { z } from 'zod'

/** Resolving against a fixed origin is what makes an off-site value detectable at all. */
const SAME_SITE_ORIGIN = 'http://localhost'

/**
 * A same-site path we are willing to redirect to, or `undefined`.
 *
 * The leading-slash test has to come first: `new URL('evil', origin)` resolves to a
 * same-origin path and would otherwise pass. Everything after it is the URL parser's
 * job, which is the point — it folds a backslash into a slash, so `/\evil.com` is
 * rejected as the off-site `//evil.com` a browser would turn it into.
 *
 * The path is returned resolved, not verbatim: `/a/../b` comes back as `/b`.
 */
export function safeCallbackUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return undefined

  const url = new URL(raw, SAME_SITE_ORIGIN)
  if (url.origin !== SAME_SITE_ORIGIN) return undefined

  return `${url.pathname}${url.search}${url.hash}`
}

/** The fields the form owns. `callbackUrl` is not one — the client reads it off the URL. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email')
    .pipe(z.email('Email không đúng định dạng')),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

/**
 * What `loginAction` accepts. `callbackUrl` takes `null` so the client can hand over
 * `URLSearchParams.get` untouched.
 */
export const loginInputSchema = loginSchema.extend({
  callbackUrl: z.string().nullish().transform(safeCallbackUrl),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export type LoginInput = z.input<typeof loginInputSchema>
