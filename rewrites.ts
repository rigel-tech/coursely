import type { NextConfig } from 'next'

/**
 * Public Vietnamese URLs mapped onto the English-named folders under
 * `src/app/(frontend)/user/`. Proxy (`src/proxy.ts`) runs before these, so it — and
 * every `redirect()` / `Link href` in the app — must keep using the public path on
 * the left, never the folder name on the right.
 */
export const rewrites: NextConfig['rewrites'] = async () => [
  { source: '/tai-khoan', destination: '/user/account' },
  { source: '/quen-mat-khau', destination: '/user/forgot-password' },
  { source: '/dat-lai-mat-khau', destination: '/user/reset-password' },
  { source: '/xac-thuc-otp', destination: '/user/verify-otp' },
]
