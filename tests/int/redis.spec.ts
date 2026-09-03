import { describe, it, expect, afterAll } from 'vitest'

import { redis } from '@/lib/redis'

describe('redis client', () => {
  afterAll(async () => {
    await redis.quit()
  })

  it('connects to the Redis server and answers PING with PONG', async () => {
    await expect(redis.ping()).resolves.toBe('PONG')
  })
})
