import type { NextConfig } from 'next'

/**
 * Public Vietnamese URLs mapped onto the English-named folders under
 * `src/app/(frontend)/student/`. Proxy (`src/proxy.ts`) runs before these, so it — and
 * every `redirect()` / `Link href` in the app — must keep using the public path on
 * the left, never the folder name on the right.
 */
export const rewrites: NextConfig['rewrites'] = async () => [
  { source: '/dang-nhap', destination: '/student/login' },
  { source: '/dang-ky', destination: '/student/register' },
  { source: '/tai-khoan', destination: '/student/account' },
  { source: '/quen-mat-khau', destination: '/student/forgot-password' },
  { source: '/dat-lai-mat-khau', destination: '/student/reset-password' },
  { source: '/xac-thuc-otp', destination: '/student/verify-otp' },
  { source: '/khoa-hoc', destination: '/courses' },
  { source: '/khoa-hoc/:slug', destination: '/courses/:slug' },
]
