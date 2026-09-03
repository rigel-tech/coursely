import { afterEach, describe, expect, it } from 'vitest'

import { checkRate } from '@/lib/rate-limit'
import { redis } from '@/lib/redis'

const keys: string[] = []
const freshKey = () => {
  const k = `test:rate:${Date.now()}:${Math.random().toString(36).slice(2)}`
  keys.push(k)
  return k
}

afterEach(async () => {
  if (keys.length) await redis.del(...keys.splice(0))
})

describe('checkRate', () => {
  it('allows hits up to the limit, then blocks', async () => {
    const key = freshKey()

    expect((await checkRate(key, 3, 60)).ok).toBe(true)
    expect((await checkRate(key, 3, 60)).ok).toBe(true)
    expect((await checkRate(key, 3, 60)).ok).toBe(true)
    expect((await checkRate(key, 3, 60)).ok).toBe(false)
  })

  it('resets once the fixed window expires', async () => {
    const key = freshKey()

    await checkRate(key, 1, 1)
    expect((await checkRate(key, 1, 1)).ok).toBe(false)

    await new Promise((r) => setTimeout(r, 1200))

    expect((await checkRate(key, 1, 1)).ok).toBe(true)
  })
})
