import { describe, expect, it } from 'vitest'
import { AuditLogs } from '@/collections/AuditLogs'
import { Categories } from '@/collections/Categories'
import { Classes } from '@/collections/Classes'
import { CourseObjectives } from '@/collections/CourseObjectives'
import { CoursePhases } from '@/collections/CoursePhases'
import { Courses } from '@/collections/Courses'
import { Enrollments } from '@/collections/Enrollments'
import { Media } from '@/collections/Media'
import { Notifications } from '@/collections/Notifications'
import { Pages } from '@/collections/Pages'
import { Payments } from '@/collections/Payments'
import { Posts } from '@/collections/Posts'
import { Users } from '@/collections/Users'
import { Footer } from '@/globals/Footer/config'
import { Header } from '@/globals/Header/config'
import { SiteSettings } from '@/globals/SiteSettings/config'
import configPromise from '@/payload.config'

const ALLOWED_GROUPS = ['Academic', 'Content', 'Users & Security', 'Configuration']

const groupName = (group: unknown) =>
  typeof group === 'string'
    ? group
    : group && typeof group === 'object' && 'en' in group && typeof group.en === 'string'
      ? group.en
      : undefined

const staticCollections = [
  Courses,
  Classes,
  Enrollments,
  CoursePhases,
  CourseObjectives,
  Categories,
  Pages,
  Payments,
  Posts,
  Media,
  Users,
  Notifications,
  AuditLogs,
]

const globals = [SiteSettings, Header, Footer]

describe('Admin Sidebar Grouping', () => {
  it('assigns every static collection to a valid functional group', () => {
    for (const col of staticCollections) {
      expect(col.admin?.group).toBeDefined()
      expect(ALLOWED_GROUPS).toContain(groupName(col.admin?.group))
    }
  })

  it('assigns every global to Configuration group', () => {
    for (const glob of globals) {
      expect(groupName(glob.admin?.group)).toBe('Configuration')
    }
  })

  it('assigns all visible collections (including plugin collections) to valid functional groups', async () => {
    const config = await configPromise
    expect(config.collections).toBeDefined()
    const visibleCollections = (config.collections || []).filter(
      (col) => !col.slug.startsWith('payload-') && !col.admin?.hidden,
    )
    // 13 static collections, minus Payments (admin.hidden — only reachable from the
    // Enrollment it belongs to), + 4 plugin collections (redirects, forms,
    // form-submissions, search) = 16 visible collections
    expect(visibleCollections.length).toBe(16)
    for (const col of visibleCollections) {
      expect(col.admin?.group, `Collection "${col.slug}" must have a group`).toBeDefined()
      expect(ALLOWED_GROUPS).toContain(groupName(col.admin?.group))
    }
  })
})
