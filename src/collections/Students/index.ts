import type { CollectionConfig } from 'payload'
import { adminGroups } from '@/lib/constants/adminGroups'
import { authenticated } from '../../access/authenticated'
import { setCreatedBy } from './hooks/setCreatedBy'

/**
 * Học viên — the public-site principal, split off from `users` so that "what is
 * this principal" is answered by the collection it belongs to rather than by a
 * `role` field. Staff live in `users` and keep the admin panel; nothing here is
 * ever a valid admin principal.
 *
 * The local strategy stays on. Students sign in with email + password, and
 * `payload.login`, `forgotPassword`, `resetPassword` and `unlock` all throw the
 * moment `disableLocalStrategy` is set.
 *
 * `useSessions: false` because the `coursely-access` / `coursely-refresh` cookie
 * pair is the student session mechanism — Payload's own JWT is discarded on every
 * sign-in, so the rows it would write have no reader. With the flag off, no
 * `sessions` field is added and no `students_sessions` table is created at all.
 */
export const Students: CollectionConfig = {
  slug: 'students',
  hooks: {
    beforeChange: [setCreatedBy],
  },
  access: {
    create: () => true,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: adminGroups.usersSecurity,
    defaultColumns: ['email', 'fullName', 'status'],
    useAsTitle: 'email',
  },
  auth: {
    useSessions: false,
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
      name: 'status',
      type: 'select',
      options: ['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED'],
      defaultValue: 'ACTIVE',
      required: true,
      admin: {
        description: 'Trạng thái tài khoản học viên',
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm:ss',
          timeIntervals: 1,
        },
      },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm:ss',
          timeIntervals: 1,
        },
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        description: 'Nhân sự đã tạo tài khoản này. Trống với tài khoản tự đăng ký.',
      },
    },
  ],
  timestamps: true,
}
