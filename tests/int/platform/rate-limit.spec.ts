import { afterEach, describe, expect, it } from 'vitest'

import { checkRate, peekRate, bumpRate, clearRate } from '@/lib/rate-limit'
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

describe('peekRate / bumpRate / clearRate', () => {
  it('peekRate reads the counter without incrementing it', async () => {
    const key = freshKey()

    expect(await peekRate(key, 3)).toEqual({ ok: true, count: 0 })

    await bumpRate(key, 60)
    await bumpRate(key, 60)

    expect(await peekRate(key, 3)).toEqual({ ok: true, count: 2 })
    expect(await peekRate(key, 3)).toEqual({ ok: true, count: 2 })
  })

  it('peekRate.ok flips once the count passes the limit', async () => {
    const key = freshKey()

    for (let i = 0; i < 3; i++) await bumpRate(key, 60)
    expect(await peekRate(key, 3)).toEqual({ ok: true, count: 3 })

    await bumpRate(key, 60)
    expect(await peekRate(key, 3)).toEqual({ ok: false, count: 4 })
  })

  it('bumpRate sets the window on the first hit only', async () => {
    const key = freshKey()

    expect(await bumpRate(key, 60)).toBe(1)
    const first = await redis.ttl(key)
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThanOrEqual(60)

    expect(await bumpRate(key, 5)).toBe(2)
    expect(await redis.ttl(key)).toBeGreaterThan(5)
  })

  it('clearRate deletes the counter', async () => {
    const key = freshKey()

    await bumpRate(key, 60)
    await clearRate(key)

    expect(await redis.exists(key)).toBe(0)
    expect(await peekRate(key, 3)).toEqual({ ok: true, count: 0 })
  })
})
