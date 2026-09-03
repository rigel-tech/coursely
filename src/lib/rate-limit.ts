/**
 * Fixed-window rate limiter backed by Redis.
 *
 * `INCR` on a per-window key; the first hit (count 1) sets the TTL, so the window
 * starts at the first request and every caller in it shares the same expiry.
 *
 * `checkRate` is the "one call per hit" form. `peekRate` / `bumpRate` split that
 * apart for flows that must look before they leap — login checks the counter
 * *before* trying `payload.login` and only `bumpRate`s on a genuine failure, then
 * `clearRate`s on success.
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

/** Read the current count for `key` without touching it. A missing key is 0. */
export async function peekRate(key: string, limit: number): Promise<RateResult> {
  const count = Number(await redis.get(key)) || 0
  return { ok: count <= limit, count }
}

/** `INCR` `key`, starting its window on the first hit. Returns the new count. */
export async function bumpRate(key: string, windowSec: number): Promise<number> {
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, windowSec)
  return count
}

/** Drop a counter — used once a login succeeds. */
export async function clearRate(key: string): Promise<void> {
  await redis.del(key)
}
