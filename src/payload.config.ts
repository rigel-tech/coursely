import { postgresAdapter } from '@payloadcms/db-postgres'
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
import { Media } from './collections/Media'
import { Notifications } from './collections/Notifications'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Students } from './collections/Students'
import { Users } from './collections/Users'
import { Footer } from './globals/Footer/config'
import { Header } from './globals/Header/config'
import { SiteSettings } from './globals/SiteSettings/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { en } from 'payload/i18n/en'
import { vi } from 'payload/i18n/vi'
import { migrations } from './migrations'
import { autoSeed } from './seed'

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
    CoursePhases,
    CourseObjectives,
    Categories,
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
    tasks: [],
  },
  onInit: async (payload) => {
    if (
      process.env.NODE_ENV !== 'test' &&
      !process.env.VITEST &&
      !process.env.NEXT_PHASE &&
      process.env.AUTO_SEED !== 'false'
    ) {
      await autoSeed(payload)
    }
  },
})
