// @vitest-environment node
// payload.login signs the JWT with jose, which needs the Node realm.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

const ctx = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      ctx.cookieJar.has(name) ? { name, value: ctx.cookieJar.get(name) } : undefined,
  }),
}))

const { GET } = await import('@/app/(frontend)/next/auth-status/route')

const AUTH_COOKIE = 'coursely-token'

type Body = { authenticated: boolean; user?: { id: number; name: string; email?: string } }
const read = async (res: Response) => (await res.json()) as Body

let payload: Payload
const emails: string[] = []

const seedAndLogin = async (fullName?: string) => {
  const email = `as-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  emails.push(email)
  await payload.create({
    collection: 'users',
    data: { email, password: 'Secret123', role: 'STUDENT', status: 'ACTIVE', fullName },
  })
  const { token } = await payload.login({
    collection: 'users',
    data: { email, password: 'Secret123' },
    context: { source: 'student' },
  })
  return { email, token: token as string }
}

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  ctx.cookieJar.clear()
  vi.useRealTimers()
  for (const email of emails.splice(0)) {
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      depth: 0,
    })
    for (const u of docs) await payload.delete({ collection: 'users', id: u.id })
  }
})

describe('GET /next/auth-status', () => {
  it('reports authenticated + profile for a valid coursely-token', async () => {
    const { email, token } = await seedAndLogin('Nguyễn Văn A')
    ctx.cookieJar.set(AUTH_COOKIE, token)

    const body = await read(await GET())
    expect(body.authenticated).toBe(true)
    expect(body.user).toMatchObject({ name: 'Nguyễn Văn A', email })
    expect(typeof body.user?.id).toBe('number')
  })

  it('reports not authenticated when the cookie is absent', async () => {
    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('reports not authenticated for a tampered signature', async () => {
    const { token } = await seedAndLogin()
    // Mutate the first char of the signature segment — unlike the last char, it
    // carries no base64url slack bits, so the change always alters the bytes.
    const [h, p, s] = token.split('.')
    const tampered = [h, p, (s[0] === 'A' ? 'B' : 'A') + s.slice(1)].join('.')
    ctx.cookieJar.set(AUTH_COOKIE, tampered)

    expect(await read(await GET())).toEqual({ authenticated: false })
  })

  it('sets no cookies on the response', async () => {
    const { token } = await seedAndLogin()
    ctx.cookieJar.set(AUTH_COOKIE, token)

    const res = await GET()
    expect(res.headers.get('set-cookie')).toBeNull()
  })
})
