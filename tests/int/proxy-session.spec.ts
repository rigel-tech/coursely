// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

import { proxy } from '@/proxy'

const ADMIN_COOKIE = 'payload-token'
const STUDENT_COOKIE = 'coursely-token'

let payload: Payload
let uid = 0
const users: number[] = []

const makeUser = async (role: 'ADMIN' | 'STUDENT' = 'STUDENT', status = 'ACTIVE') => {
  const email = `proxy-${Date.now()}-${uid++}-${Math.random().toString(36).slice(2)}@example.com`
  const u = await payload.create({
    collection: 'users',
    data: { email, password: 'Secret123', role, status: status as 'ACTIVE' },
  })
  users.push(u.id as number)
  const { token } = await payload.login({
    collection: 'users',
    data: { email, password: 'Secret123' },
    // the boundary hook keys off this; ADMIN logs in without it
    context: role === 'STUDENT' ? { source: 'student' } : undefined,
  })
  return { user: u, token: token as string }
}

const req = (url: string, cookie?: string) =>
  new NextRequest(url, { headers: cookie ? { cookie } : {} })

beforeAll(async () => {
  payload = await getPayload({ config: await configPromise })
})

afterEach(async () => {
  for (const id of users.splice(0)) {
    await payload.delete({ collection: 'users', id })
  }
})

describe('proxy — student area reads coursely-token', () => {
  it('ACTIVE student with a valid coursely-token: serves /tai-khoan', async () => {
    const { token } = await makeUser('STUDENT')
    const res = await proxy(req('http://localhost/tai-khoan', `${STUDENT_COOKIE}=${token}`))
    expect(res.headers.get('location')).toBeNull()
  })

  it("an admin's payload-token does not count on /tai-khoan — bounced to sign-in", async () => {
    const { token } = await makeUser('ADMIN')
    const res = await proxy(req('http://localhost/tai-khoan', `${ADMIN_COOKIE}=${token}`))
    expect(res.headers.get('location')).toContain('/dang-nhap?callbackUrl=')
  })

  it('no cookie: /tai-khoan redirects to the sign-in page', async () => {
    const res = await proxy(req('http://localhost/tai-khoan'))
    expect(res.headers.get('location')).toContain('/dang-nhap?callbackUrl=')
  })
})

describe('proxy — admin area reads payload-token', () => {
  it('an ADMIN payload-token on /admin is served', async () => {
    const { token } = await makeUser('ADMIN')
    const res = await proxy(req('http://localhost/admin', `${ADMIN_COOKIE}=${token}`))
    expect(res.headers.get('location')).toBeNull()
  })

  it("a student's coursely-token on /admin is ignored — anonymous, no redirect", async () => {
    const { token } = await makeUser('STUDENT')
    const res = await proxy(req('http://localhost/admin', `${STUDENT_COOKIE}=${token}`))
    expect(res.headers.get('location')).toBeNull()
  })
})
