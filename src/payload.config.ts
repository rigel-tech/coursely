import { postgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres/drizzle'
import { uniqueIndex } from '@payloadcms/db-postgres/drizzle/pg-core'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Classes } from './collections/Classes'
import { CourseObjectives } from './collections/CourseObjectives'
import { CoursePhases } from './collections/CoursePhases'
import { Courses } from './collections/Courses'
import { Enrollments } from './collections/Enrollments'
import { Media } from './collections/Media'
import { Notifications } from './collections/Notifications'
import { Pages } from './collections/Pages'
import { Payments } from './collections/Payments'
import { Posts } from './collections/Posts'
import { Students } from './collections/Students'
import { Users } from './collections/Users'
import { Footer } from './globals/Footer/config'
import { Header } from './globals/Header/config'
import { SiteSettings } from './globals/SiteSettings/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { notificationTasks } from '@/notifications/jobs'
import { NOTIFICATIONS_QUEUE } from '@/notifications/queue'
import { getServerSideURL } from './utilities/getURL'
import { en } from 'payload/i18n/en'
import { vi } from 'payload/i18n/vi'
import { migrations } from './migrations'
import { autoSeed } from './seed/index'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  i18n: {
    supportedLanguages: { en, vi },
    fallbackLanguage: 'vi',
  },
  admin: {
    meta: {
      titleSuffix: '- Coursely',
    },
    components: {
      graphics: {
        Logo: '@/components/admin/Graphics/Logo#Logo',
        Icon: '@/components/admin/Graphics/Icon#Icon',
      },
      actions: ['@/components/admin/NotificationBell#NotificationBell'],
      providers: ['@/components/admin/HidePaymentsCreateButton#HidePaymentsCreateButton'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    prodMigrations: migrations,
    // A student may hold at most one *active* enrollment per course — CANCELLED does not
    // count (specs/007-student-enrollment, Story 3). A plain compound-unique index can't
    // express that exception; a partial index can. This is what dev/test's drizzle-push
    // creates; prod instead applies the hand-written
    // `20260914_130000_add_enrollment_active_guard` migration, which must define the same
    // index. `src/services/student-enrollment.ts`'s `checkExistingEnrollment` only mirrors
    // this for a fast, specific message — it is not itself the guard (see INVARIANTS.md).
    afterSchemaInit: [
      ({ extendTable, schema }) => {
        extendTable({
          table: schema.tables.enrollments,
          extraConfig: (table) => ({
            enrollmentsActiveStudentCourseIdx: uniqueIndex('enrollments_active_student_course_idx')
              .on(table.student, table.course)
              .where(sql`${table.enrollmentStatus} <> 'CANCELLED'`),
          }),
        })

        extendTable({
          table: schema.tables.payments,
          extraConfig: (table) => ({
            paymentsEnrollmentIdUniqueIdx: uniqueIndex('payments_enrollment_id_unique_idx').on(
              table.enrollmentId,
            ),
          }),
        })

        return schema
      },
    ],
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM_ADDRESS,
    defaultFromName: process.env.SMTP_FROM_NAME,
    transportOptions: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      // Port 465 is implicit TLS — `secure` must be true or the handshake fails.
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    // No boot-time SMTP round-trip on every dev start / CLI run; a bad
    // credential surfaces on the first real send instead.
    skipVerify: true,
  }),
  collections: [
    // --- 1. Academic (Khóa học & Đào tạo) ---
    Students,
    Courses,
    Classes,
    Enrollments,
    CoursePhases,
    CourseObjectives,
    Categories,
    Payments,
    // --- 2. Content (Nội dung & Truyền thông) ---
    Pages,
    Posts,
    Media,
    // --- 3. Users & Security (Người dùng & Bảo mật) ---
    Users,
    Notifications,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, SiteSettings],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: notificationTasks,
    // Only the notifications queue: `schedulePublish` jobs sit on `default`, and nothing
    // has ever run that queue here.
    autoRun: [{ cron: '*/10 * * * * *', queue: NOTIFICATIONS_QUEUE }],
    // Same exclusions as `onInit` — a test run or a build must never start sending.
    shouldAutoRun: () =>
      process.env.NODE_ENV !== 'test' &&
      !process.env.VITEST &&
      process.env.NEXT_PHASE !== 'phase-production-build',
  },
  onInit: async (payload) => {
    if (
      process.env.NODE_ENV !== 'test' &&
      !process.env.VITEST &&
      process.env.NEXT_PHASE !== 'phase-production-build' &&
      process.env.AUTO_SEED !== 'false'
    ) {
      await autoSeed(payload)
    }
  },
})
