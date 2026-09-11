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

const ALLOWED_GROUPS = [
  { vi: 'Khóa học & Đào tạo', en: 'Academic' },
  { vi: 'Nội dung', en: 'Content' },
  { vi: 'Người dùng & Bảo mật', en: 'Users & Security' },
  { vi: 'Cấu hình', en: 'Configuration' },
]

const collections = [
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
  it('assigns every collection to a valid functional group', () => {
    for (const col of collections) {
      expect(col.admin?.group).toBeDefined()
      expect(ALLOWED_GROUPS).toContainEqual(col.admin?.group)
    }
  })

  it('assigns every global to Configuration group', () => {
    for (const glob of globals) {
      expect(glob.admin?.group).toEqual({
        vi: 'Cấu hình',
        en: 'Configuration',
      })
    }
  })
})
