import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  revalidateCourse,
  revalidateCourseDelete,
  revalidateParentCourse,
  revalidateParentCourseDelete,
} from '@/collections/Courses/hooks/revalidateCourse'

const revalidated: string[] = []
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidated.push(path),
}))

const SLUGS: Record<number, string> = { 1: 'tieng-anh', 2: 'tieng-nhat' }
const findByID = vi.fn(async ({ id }: { id: number }) => ({ id, slug: SLUGS[id] }))

const req = (context: Record<string, unknown> = {}) => ({ payload: { findByID }, context }) as never

type Args = Record<string, unknown>
const change = (hook: (a: never) => unknown, args: Args) => hook(args as never)

const course = (slug: string, _status: 'draft' | 'published') => ({ id: 1, slug, _status })

beforeEach(() => {
  revalidated.length = 0
  findByID.mockClear()
})

describe('revalidateCourse', () => {
  it('revalidates the folder path of a course when it is published', () => {
    change(revalidateCourse, {
      doc: course('tieng-anh', 'published'),
      previousDoc: course('tieng-anh', 'draft'),
      req: req(),
    })
    expect(revalidated).toEqual(['/courses/tieng-anh'])
  })

  it('revalidates the page a course is unpublished from', () => {
    change(revalidateCourse, {
      doc: course('tieng-anh', 'draft'),
      previousDoc: course('tieng-anh', 'published'),
      req: req(),
    })
    expect(revalidated).toEqual(['/courses/tieng-anh'])
  })

  it('revalidates both the new and the old path when a published course is re-slugged', () => {
    change(revalidateCourse, {
      doc: course('tieng-anh-moi', 'published'),
      previousDoc: course('tieng-anh', 'published'),
      req: req(),
    })
    expect(revalidated.sort()).toEqual(['/courses/tieng-anh', '/courses/tieng-anh-moi'])
  })

  it('revalidates the page of a deleted course', () => {
    change(revalidateCourseDelete, { doc: course('tieng-anh', 'published'), req: req() })
    expect(revalidated).toEqual(['/courses/tieng-anh'])
  })

  it('does nothing under context.disableRevalidate', () => {
    const r = req({ disableRevalidate: true })
    change(revalidateCourse, {
      doc: course('tieng-anh', 'published'),
      previousDoc: course('tieng-anh', 'published'),
      req: r,
    })
    change(revalidateCourseDelete, { doc: course('tieng-anh', 'published'), req: r })
    expect(revalidated).toEqual([])
  })
})

describe('revalidateParentCourse', () => {
  it('revalidates the parent course page when an objective or phase is saved', async () => {
    await change(revalidateParentCourse, {
      doc: { id: 9, course: 1 },
      previousDoc: { id: 9, course: 1 },
      req: req(),
    })
    expect(revalidated).toEqual(['/courses/tieng-anh'])
  })

  it('accepts a populated course as well as its id', async () => {
    await change(revalidateParentCourse, {
      doc: { id: 9, course: { id: 1, slug: 'tieng-anh' } },
      previousDoc: { id: 9, course: { id: 1, slug: 'tieng-anh' } },
      req: req(),
    })
    expect(revalidated).toEqual(['/courses/tieng-anh'])
  })

  it('revalidates both courses when an objective or phase moves to another course', async () => {
    await change(revalidateParentCourse, {
      doc: { id: 9, course: 2 },
      previousDoc: { id: 9, course: 1 },
      req: req(),
    })
    expect(revalidated.sort()).toEqual(['/courses/tieng-anh', '/courses/tieng-nhat'])
  })

  it('revalidates the parent course page when an objective or phase is deleted', async () => {
    await change(revalidateParentCourseDelete, { doc: { id: 9, course: 2 }, req: req() })
    expect(revalidated).toEqual(['/courses/tieng-nhat'])
  })

  it('does nothing under context.disableRevalidate', async () => {
    const r = req({ disableRevalidate: true })
    await change(revalidateParentCourse, {
      doc: { id: 9, course: 1 },
      previousDoc: { id: 9, course: 1 },
      req: r,
    })
    await change(revalidateParentCourseDelete, { doc: { id: 9, course: 1 }, req: r })
    expect(revalidated).toEqual([])
    expect(findByID).not.toHaveBeenCalled()
  })
})

// `/khoa-hoc/:slug` is a rewrite onto `/courses/:slug`. `revalidatePath` takes the route's
// own path, so the public one would be accepted without error and purge nothing.
describe('never the public rewrite source', () => {
  it('no hook ever revalidates a /khoa-hoc path', async () => {
    change(revalidateCourse, {
      doc: course('b', 'published'),
      previousDoc: course('a', 'published'),
      req: req(),
    })
    change(revalidateCourseDelete, { doc: course('a', 'published'), req: req() })
    await change(revalidateParentCourse, {
      doc: { id: 9, course: 2 },
      previousDoc: { id: 9, course: 1 },
      req: req(),
    })
    await change(revalidateParentCourseDelete, { doc: { id: 9, course: 1 }, req: req() })

    expect(revalidated.length).toBeGreaterThan(0)
    expect(revalidated.filter((p) => !p.startsWith('/courses/'))).toEqual([])
  })
})
