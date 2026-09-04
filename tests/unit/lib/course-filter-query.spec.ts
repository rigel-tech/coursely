import { describe, expect, it } from 'vitest'
import { buildCourseWhereQuery } from '@/lib/course/build-filter-query'

describe('buildCourseWhereQuery', () => {
  it('returns published filter only when no category or query is provided', () => {
    const where = buildCourseWhereQuery({})
    expect(where).toEqual({
      _status: {
        equals: 'published',
      },
    })
  })

  it('filters by category slug when provided', () => {
    const where = buildCourseWhereQuery({ categorySlug: 'ielts' })
    expect(where).toEqual({
      and: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          'category.slug': {
            equals: 'ielts',
          },
        },
      ],
    })
  })

  it('filters by title query when search keyword is provided', () => {
    const where = buildCourseWhereQuery({ query: 'giao tiep' })
    expect(where).toEqual({
      and: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          title: {
            like: '%giao tiep%',
          },
        },
      ],
    })
  })

  it('combines category and title search query', () => {
    const where = buildCourseWhereQuery({ categorySlug: 'toeic', query: 'cap toc' })
    expect(where).toEqual({
      and: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          'category.slug': {
            equals: 'toeic',
          },
        },
        {
          title: {
            like: '%cap toc%',
          },
        },
      ],
    })
  })

  it('ignores category if set to "all" or whitespace', () => {
    const where = buildCourseWhereQuery({ categorySlug: 'all', query: '  ' })
    expect(where).toEqual({
      _status: {
        equals: 'published',
      },
    })
  })

  it('filters by date range when startDateFrom and startDateTo are provided', () => {
    const where = buildCourseWhereQuery({
      startDateFrom: '2026-09-01',
      startDateTo: '2026-09-30',
    })
    expect(where).toEqual({
      and: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          registrationStartAt: {
            greater_than_equal: '2026-09-01',
          },
        },
        {
          registrationStartAt: {
            less_than_equal: '2026-09-30',
          },
        },
      ],
    })
  })
})
