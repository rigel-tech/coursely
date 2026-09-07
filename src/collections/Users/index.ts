import type { CollectionConfig } from 'payload'

import { SESSION_TTL_SEC } from '@/lib/constants/auth'
import { authenticated } from '../../access/authenticated'
import { enforceLoginBoundary } from './hooks/enforceLoginBoundary'

/**
 * Accounts for the whole platform — Admins and Students, self-registered or
 * created at the counter (walk-in). Shape follows the `users` table in the data
 * model: Payload's auth adds `email` / `hash` / `salt`, and `timestamps` adds
 * `createdAt` / `updatedAt`; everything else is declared here.
 *
 * Email verification is NOT Payload's built-in token flow — it runs through the
 * OTP store in Redis, and `status` is the source of truth for whether an account
 * may sign in (`verifiedAt` only records when it happened).
 *
 * Auth is Payload-native and split by surface: `payload.login` mints a session
 * JWT, the student form stores it as `coursely-token` and the admin panel as
 * `payload-token`. `useSessions` is Payload's default, so a `users_sessions` row
 * backs every token and `logout` can revoke it. `tokenExpiration` is the single
 * session lifetime — no short-access / long-refresh split. `enforceLoginBoundary`
 * keeps each form to its own role; `admin` access is ADMIN-only so a student can
 * never enter the panel even if a token leaks across.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => user?.role === 'ADMIN',
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  hooks: {
    beforeLogin: [enforceLoginBoundary],
  },
  admin: {
    group: 'Accounts & Notifications',
    defaultColumns: ['email', 'fullName', 'role', 'status'],
    useAsTitle: 'email',
  },
  auth: {
    tokenExpiration: SESSION_TTL_SEC,
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      label: 'Họ và tên',
      maxLength: 255,
    },
    {
      name: 'phone',
      type: 'text',
      maxLength: 30,
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'role',
      type: 'select',
      options: ['ADMIN', 'STUDENT'],
      defaultValue: 'STUDENT',
      required: true,
      saveToJWT: true,
    },
    {
      name: 'status',
      type: 'select',
      options: ['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED'],
      defaultValue: 'PENDING_VERIFICATION',
      required: true,
      saveToJWT: true,
    },
    {
      name: 'isWalkIn',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Tài khoản do Admin tạo trực tiếp tại quầy, không qua tự đăng ký web.',
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin đã tạo tài khoản này. Trống với tài khoản tự đăng ký.',
      },
    },
  ],
  timestamps: true,
}
