import { describe, expect, it, vi, beforeEach } from 'vitest'
import { revalidateHeader } from '@/Header/hooks/revalidateHeader'
import { getHeaderData, HEADER_CACHE_KEY } from '@/Header/service'
import { redis } from '@/lib/redis'
import { revalidateTag } from 'next/cache'

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    findGlobal: vi.fn().mockResolvedValue({
      navItems: [
        {
          link: {
            label: 'Trang chủ',
            url: '/',
          },
        },
      ],
    }),
  }),
}))

vi.mock('@payload-config', () => ({
  default: Promise.resolve({}),
}))

describe('Header Caching and Revalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('revalidateHeader hook', () => {
    it('deletes Redis cache key and calls revalidateTag when revalidation is enabled', async () => {
      const doc = { id: 'header-doc' }
      const req = {
        payload: {
          logger: {
            info: vi.fn(),
            error: vi.fn(),
          },
        },
        context: {},
      }

      const result = await revalidateHeader({
        doc,
        req,
      } as unknown as Parameters<typeof revalidateHeader>[0])

      expect(redis.del).toHaveBeenCalledWith(HEADER_CACHE_KEY)
      expect(revalidateTag).toHaveBeenCalledWith('global_header', 'max')
      expect(result).toBe(doc)
    })

    it('skips invalidation if disableRevalidate is true in context', async () => {
      const doc = { id: 'header-doc' }
      const req = {
        payload: {
          logger: {
            info: vi.fn(),
            error: vi.fn(),
          },
        },
        context: {
          disableRevalidate: true,
        },
      }

      await revalidateHeader({
        doc,
        req,
      } as unknown as Parameters<typeof revalidateHeader>[0])

      expect(redis.del).not.toHaveBeenCalled()
      expect(revalidateTag).not.toHaveBeenCalled()
    })
  })

  describe('getHeaderData', () => {
    it('returns cached data directly from Redis when cache hit', async () => {
      const mockCachedData = {
        navItems: [{ link: { label: 'Cached Item', url: '/cached' } }],
      }
      vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(mockCachedData))

      const data = await getHeaderData()

      expect(redis.get).toHaveBeenCalledWith(HEADER_CACHE_KEY)
      expect(data).toEqual(mockCachedData)
      expect(redis.set).not.toHaveBeenCalled()
    })

    it('fetches from payload and populates Redis on cache miss', async () => {
      vi.mocked(redis.get).mockResolvedValueOnce(null)

      const data = await getHeaderData()

      expect(redis.get).toHaveBeenCalledWith(HEADER_CACHE_KEY)
      expect(data?.navItems?.[0]?.link?.label).toBe('Trang chủ')
      expect(redis.set).toHaveBeenCalledWith(HEADER_CACHE_KEY, expect.stringContaining('Trang chủ'))
    })
  })
})
