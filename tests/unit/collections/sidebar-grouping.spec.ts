import { describe, expect, it } from 'vitest'
import { AuditLogs } from '@/collections/AuditLogs'
import { Categories } from '@/collections/Categories'
import { Classes } from '@/collections/Classes'
import { CourseObjectives } from '@/collections/CourseObjectives'
import { CoursePhases } from '@/collections/CoursePhases'
import { Courses } from '@/collections/Courses'
import { Media } from '@/collections/Media'
import { Notifications } from '@/collections/Notifications'
import { Pages } from '@/collections/Pages'
import { Posts } from '@/collections/Posts'
import { Users } from '@/collections/Users'
import { Footer } from '@/globals/Footer/config'
import { Header } from '@/globals/Header/config'
import { SiteSettings } from '@/globals/SiteSettings/config'
import { adminGroups } from '@/lib/constants/adminGroups'
import configPromise from '@/payload.config'

const ALLOWED_GROUPS = Object.values(adminGroups)

const staticCollections = [
  Courses,
  Classes,
  CoursePhases,
  CourseObjectives,
  Categories,
  Pages,
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
      expect(ALLOWED_GROUPS).toContainEqual(col.admin?.group)
    }
  })

  it('assigns every global to Configuration group', () => {
    for (const glob of globals) {
      expect(glob.admin?.group).toEqual(adminGroups.configuration)
    }
  })

  it('assigns all visible collections (including plugin collections) to valid functional groups', async () => {
    const config = await configPromise
    expect(config.collections).toBeDefined()
    const visibleCollections = (config.collections || []).filter(
      (col) => !col.slug.startsWith('payload-') && !col.admin?.hidden,
    )
    // 11 static collections + 4 plugin collections (redirects, forms, form-submissions, search) = 15 collections
    expect(visibleCollections.length).toBe(15)
    for (const col of visibleCollections) {
      expect(col.admin?.group, `Collection "${col.slug}" must have a group`).toBeDefined()
      expect(ALLOWED_GROUPS).toContainEqual(col.admin?.group)
    }
  })
})
