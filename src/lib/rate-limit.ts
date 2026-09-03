/**
 * Fixed-window rate limiter backed by Redis.
 *
 * `INCR` on a per-window key; the first hit (count 1) sets the TTL, so the window
 * starts at the first request and every caller in it shares the same expiry.
 */
import { redis } from '@/lib/redis'

export type RateResult = { ok: boolean; count: number }

export async function checkRate(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateResult> {
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSec)
  return { ok: count <= limit, count }
}
