/**
 * Scoped Redis cleanup for the session-store int specs. These files run in
 * parallel against one Redis, so a blanket `KEYS session:*` + `DEL` in one file's
 * `afterEach` would wipe another file's live sessions. Track only what a test
 * touched and delete exactly that.
 */
import { redis } from '@/lib/redis'
import { hashRefreshToken } from '@/services/session-token'

export class SessionScope {
  private userIds = new Set<number>()
  private rawTokens = new Set<string>()

  /** Register a user whose sessions this test creates. */
  user(id: number): number {
    this.userIds.add(id)
    return id
  }

  /** Register every raw refresh token the test has seen (initial + rotated). */
  token(...raws: string[]): void {
    for (const r of raws) this.rawTokens.add(r)
  }

  /** Delete every session record, lookup, marker and index entry this test created. */
  async cleanup(): Promise<void> {
    const sids = new Set<string>()
    const hashes = new Set<string>()

    for (const uid of this.userIds) {
      const members = await redis.smembers(`session:index:${uid}`)
      members.forEach((s) => sids.add(s))
    }
    for (const raw of this.rawTokens) hashes.add(hashRefreshToken(raw))
    for (const h of hashes) {
      const sid = await redis.get(`refresh:${h}`)
      if (sid) sids.add(sid)
    }
    // pick up the current hash of every session we found, so a rotation we did not
    // track by raw token is still cleaned
    for (const sid of sids) {
      const h = await redis.hget(`session:${sid}`, 'refreshHash')
      if (h) hashes.add(h)
    }

    const keys: string[] = []
    for (const sid of sids) keys.push(`session:${sid}`, `race:${sid}`, `lock:sess:${sid}`)
    for (const uid of this.userIds) keys.push(`session:index:${uid}`)
    for (const h of hashes) keys.push(`refresh:${h}`, `spent:${h}`)
    if (keys.length) await redis.del(...keys)

    this.userIds.clear()
    this.rawTokens.clear()
  }
}
