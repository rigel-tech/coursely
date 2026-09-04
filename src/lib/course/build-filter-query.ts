import type { Where } from 'payload'

export interface CourseFilterParams {
  categorySlug?: string | null
  query?: string | null
}

/**
 * Builds the Payload `where` query for filtering published courses (US-103).
 * Ensures that only published courses are returned and never classes.
 */
export function buildCourseWhereQuery(params: CourseFilterParams): Where {
  const conditions: Where[] = [
    {
      _status: {
        equals: 'published',
      },
    },
  ]

  const category = params.categorySlug?.trim()
  if (category && category !== 'all') {
    conditions.push({
      'category.slug': {
        equals: category,
      },
    })
  }

  const q = params.query?.trim()
  if (q) {
    conditions.push({
      title: {
        like: `%${q}%`,
      },
    })
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  return {
    and: conditions,
  }
}
