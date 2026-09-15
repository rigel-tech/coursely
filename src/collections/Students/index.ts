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
  labels: {
    singular: { vi: 'Học viên', en: 'Student' },
    plural: { vi: 'Học viên', en: 'Students' },
  },
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
      label: { vi: 'Họ và tên', en: 'Full Name' },
      maxLength: 255,
    },
    {
      name: 'phone',
      type: 'text',
      label: { vi: 'Số điện thoại', en: 'Phone' },
      maxLength: 30,
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: { vi: 'Ảnh đại diện', en: 'Avatar' },
    },
    {
      name: 'status',
      type: 'select',
      label: { vi: 'Trạng thái', en: 'Status' },
      options: [
        {
          label: { vi: 'Chờ xác minh', en: 'Pending Verification' },
          value: 'PENDING_VERIFICATION',
        },
        { label: { vi: 'Đang hoạt động', en: 'Active' }, value: 'ACTIVE' },
        { label: { vi: 'Đã khóa', en: 'Disabled' }, value: 'DISABLED' },
      ],
      defaultValue: 'ACTIVE',
      required: true,
      admin: {
        description: { vi: 'Trạng thái tài khoản học viên', en: 'Student account status' },
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      label: { vi: 'Thời điểm xác minh', en: 'Verified At' },
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
      label: { vi: 'Lần đăng nhập gần nhất', en: 'Last Login At' },
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
      label: { vi: 'Người tạo', en: 'Created By' },
      admin: {
        readOnly: true,
        description: {
          vi: 'Nhân sự đã tạo tài khoản này. Trống với tài khoản tự đăng ký.',
          en: 'Staff member who created this account. Empty for self-registered accounts.',
        },
      },
    },
  ],
  timestamps: true,
}
