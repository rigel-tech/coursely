import { describe, it, expect } from 'vitest'

import { redis } from '@/lib/redis'

describe('redis client module', () => {
  it('exposes the same client instance on every import (one connection per process)', async () => {
    const reimported = (await import('@/lib/redis')).redis

    expect(reimported).toBe(redis)
  })
})
