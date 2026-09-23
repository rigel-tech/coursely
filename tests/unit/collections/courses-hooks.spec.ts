import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'

import { Courses } from '@/collections/Courses'
import { revalidateCourse, revalidateDelete } from '@/collections/Courses/hooks/revalidateCourse'
import type { Course } from '@/payload-types'

const mockRevalidatePath = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}))

const dummyCourse = (overrides: Partial<Course> = {}): Course =>
  ({
    id: 1,
    title: 'Khóa học lập trình',
    slug: 'lap-trinh',
    _status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    courseType: 'OFFLINE',
    ...overrides,
  }) as Course

const mockReq = (disableRevalidate = false): PayloadRequest =>
  ({
    payload: {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
    },
    context: {
      disableRevalidate,
    },
  }) as unknown as PayloadRequest

describe('Courses collection configuration', () => {
  it('wires revalidateCourse and revalidateDelete into hooks', () => {
    expect(Courses.hooks?.afterChange).toContain(revalidateCourse)
    expect(Courses.hooks?.afterDelete).toContain(revalidateDelete)
  })
})

describe('revalidateCourse hook', () => {
  beforeEach(() => {
    mockRevalidatePath.mockClear()
  })

  it('revalidates public path, internal path, and home page on published course', () => {
    const doc = dummyCourse({ slug: 'khoa-hoc-moi', _status: 'published' })

    const result = revalidateCourse({
      doc,
      previousDoc: undefined as unknown as Course,
      req: mockReq(),
      operation: 'create',
    } as never)

    expect(result).toBe(doc)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/khoa-hoc/khoa-hoc-moi')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/courses/khoa-hoc-moi')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledTimes(3)
  })

  it('does not revalidate when draft is saved without being published previously', () => {
    const doc = dummyCourse({ slug: 'khoa-hoc-nhap', _status: 'draft' })

    revalidateCourse({
      doc,
      previousDoc: undefined as unknown as Course,
      req: mockReq(),
      operation: 'create',
    } as never)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('revalidates old paths and home page when a published course is unpublished', () => {
    const previousDoc = dummyCourse({ slug: 'khoa-hoc-cu', _status: 'published' })
    const doc = dummyCourse({ slug: 'khoa-hoc-cu', _status: 'draft' })

    revalidateCourse({
      doc,
      previousDoc,
      req: mockReq(),
      operation: 'update',
    } as never)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/khoa-hoc/khoa-hoc-cu')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/courses/khoa-hoc-cu')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledTimes(3)
  })

  it('revalidates both old and new paths when the slug of a published course changes', () => {
    const previousDoc = dummyCourse({ slug: 'slug-cu', _status: 'published' })
    const doc = dummyCourse({ slug: 'slug-moi', _status: 'published' })

    revalidateCourse({
      doc,
      previousDoc,
      req: mockReq(),
      operation: 'update',
    } as never)

    // New paths
    expect(mockRevalidatePath).toHaveBeenCalledWith('/khoa-hoc/slug-moi')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/courses/slug-moi')
    // Old paths
    expect(mockRevalidatePath).toHaveBeenCalledWith('/khoa-hoc/slug-cu')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/courses/slug-cu')
    // Home page
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('skips revalidation when context.disableRevalidate is true', () => {
    const doc = dummyCourse({ slug: 'khoa-hoc-moi', _status: 'published' })

    revalidateCourse({
      doc,
      previousDoc: undefined as unknown as Course,
      req: mockReq(true),
      operation: 'create',
    } as never)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('does not throw when revalidatePath throws outside Next.js request context', () => {
    mockRevalidatePath.mockImplementation(() => {
      throw new Error('Invariant: static generation store missing')
    })

    const doc = dummyCourse({ slug: 'khoa-hoc-moi', _status: 'published' })

    expect(() =>
      revalidateCourse({
        doc,
        previousDoc: undefined as unknown as Course,
        req: mockReq(),
        operation: 'create',
      } as never),
    ).not.toThrow()
  })
})

describe('revalidateDelete hook', () => {
  beforeEach(() => {
    mockRevalidatePath.mockClear()
  })

  it('revalidates public path, internal path, and home page on delete', () => {
    const doc = dummyCourse({ slug: 'khoa-hoc-xoa' })

    const result = revalidateDelete({
      doc,
      req: mockReq(),
      id: 1,
    } as never)

    expect(result).toBe(doc)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/khoa-hoc/khoa-hoc-xoa')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/courses/khoa-hoc-xoa')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledTimes(3)
  })

  it('skips revalidation on delete when context.disableRevalidate is true', () => {
    const doc = dummyCourse({ slug: 'khoa-hoc-xoa' })

    revalidateDelete({
      doc,
      req: mockReq(true),
      id: 1,
    } as never)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('does not throw when revalidatePath throws on delete outside Next.js request context', () => {
    mockRevalidatePath.mockImplementation(() => {
      throw new Error('Invariant: static generation store missing')
    })

    const doc = dummyCourse({ slug: 'khoa-hoc-xoa' })

    expect(() =>
      revalidateDelete({
        doc,
        req: mockReq(),
        id: 1,
      } as never),
    ).not.toThrow()
  })
})
