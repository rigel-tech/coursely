import type { Where } from 'payload'

export interface CourseFilterParams {
  categorySlug?: string | null
  courseType?: string | null
  query?: string | null
  startDateFrom?: string | null
  startDateTo?: string | null
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

  const cType = params.courseType?.trim()?.toUpperCase()
  if (cType && cType !== 'ALL') {
    conditions.push({
      courseType: {
        equals: cType,
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

  const from = params.startDateFrom?.trim()
  if (from) {
    conditions.push({
      registrationStartAt: {
        greater_than_equal: from,
      },
    })
  }

  const to = params.startDateTo?.trim()
  if (to) {
    conditions.push({
      registrationStartAt: {
        less_than_equal: to,
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
