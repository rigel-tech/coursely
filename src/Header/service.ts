import type { Header as HeaderType } from '@/payload-types'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { redis } from '@/lib/redis'

export const HEADER_CACHE_KEY = 'global_header'

/**
 * Retrieves the header global data with Redis caching and depth=2 to populate sub-menu documents.
 */
export async function getHeaderData(): Promise<HeaderType | null> {
  // 1. Try Redis cache first
  try {
    const cached = await redis.get(HEADER_CACHE_KEY)
    //console.log(cached)
    if (cached) {
      return JSON.parse(cached) as HeaderType
    }
  } catch (err) {
    console.error('Redis error reading header cache:', err)
  }

  // 2. Cache miss -> query Payload Local API with depth: 2
  try {
    const payload = await getPayload({ config: configPromise })
    const data = (await payload.findGlobal({
      slug: 'header',
      depth: 2,
    })) as HeaderType

    // 3. Store into Redis
    if (data) {
      try {
        await redis.set(HEADER_CACHE_KEY, JSON.stringify(data))
      } catch (err) {
        console.error('Redis error writing header cache:', err)
      }
    }

    return data
  } catch (err) {
    console.error('Payload error fetching header global:', err)
    return null
  }
}
