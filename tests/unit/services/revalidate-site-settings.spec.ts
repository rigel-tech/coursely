import { describe, expect, it, vi, beforeEach } from 'vitest'
import { revalidateSiteSettings } from '@/globals/SiteSettings/hooks/revalidateSiteSettings'
import type { SiteSetting } from '@/payload-types'
import type { Payload } from 'payload'

const mockRevalidateTag = vi.fn()
vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}))

describe('revalidateSiteSettings hook', () => {
  beforeEach(() => {
    mockRevalidateTag.mockClear()
  })

  it('calls revalidateTag with global_site-settings and max tag profile', () => {
    const mockDoc = { id: 1, siteName: 'SPEAKEDGE' } as unknown as SiteSetting
    const mockLogger = { info: vi.fn() }
    const mockPayload = { logger: mockLogger } as unknown as Payload
    const mockContext = {}

    const result = revalidateSiteSettings({
      doc: mockDoc,
      req: { payload: mockPayload, context: mockContext } as any,
    } as unknown as Parameters<typeof revalidateSiteSettings>[0])

    expect(result).toBe(mockDoc)
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1)
    expect(mockRevalidateTag).toHaveBeenCalledWith('global_site-settings', 'max')
  })

  it('does NOT call revalidateTag when context.disableRevalidate is true', () => {
    const mockDoc = { id: 1, siteName: 'SPEAKEDGE' } as unknown as SiteSetting
    const mockLogger = { info: vi.fn() }
    const mockPayload = { logger: mockLogger } as unknown as Payload
    const mockContext = { disableRevalidate: true }

    const result = revalidateSiteSettings({
      doc: mockDoc,
      req: { payload: mockPayload, context: mockContext } as any,
    } as unknown as Parameters<typeof revalidateSiteSettings>[0])

    expect(result).toBe(mockDoc)
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })
})
