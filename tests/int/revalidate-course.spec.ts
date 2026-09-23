// @vitest-environment node
// The unit spec drives the hooks by hand; this is what shows `Courses` actually runs them,
// through the Local API, on the operations an editor performs.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'

const ctx = vi.hoisted(() => ({ revalidated: [] as string[] }))

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => ctx.revalidated.push(path),
}))

let payload: Payload
const madeIds = new Set<number>()

const uniqueSlug = () => `rv-${Date.now()}-${Math.random().toString(36).slice(2)}`

const seedCourse = async (slug: string) => {
  const course = await payload.create({
    collection: 'courses',
    data: {
      title: slug,
      slug,
      generateSlug: false,
      courseType: 'OFFLINE',
      _status: 'published',
    },
  })
  madeIds.add(course.id)
  return course
}

beforeAll(async () => {
  payload = await getPayload({ config: configPromise })
})

afterEach(() => {
  ctx.revalidated.length = 0
})

afterAll(async () => {
  for (const id of madeIds) {
    await payload.delete({ collection: 'courses', id, context: { disableRevalidate: true } })
  }
})

describe('Courses runs its revalidation hooks', () => {
  it('publishing a course revalidates its folder path and the home page', async () => {
    const slug = uniqueSlug()
    await seedCourse(slug)

    expect(ctx.revalidated.sort()).toEqual(['/', `/courses/${slug}`])
  })

  it('re-slugging a published course revalidates the new path, the old path and the home page', async () => {
    const oldSlug = uniqueSlug()
    const course = await seedCourse(oldSlug)
    ctx.revalidated.length = 0

    const newSlug = uniqueSlug()
    await payload.update({ collection: 'courses', id: course.id, data: { slug: newSlug } })

    expect(ctx.revalidated.sort()).toEqual(
      ['/', `/courses/${newSlug}`, `/courses/${oldSlug}`].sort(),
    )
  })

  it('deleting a course revalidates its folder path and the home page', async () => {
    const slug = uniqueSlug()
    const course = await seedCourse(slug)
    ctx.revalidated.length = 0

    await payload.delete({ collection: 'courses', id: course.id })
    madeIds.delete(course.id)

    expect(ctx.revalidated.sort()).toEqual(['/', `/courses/${slug}`])
  })
})
