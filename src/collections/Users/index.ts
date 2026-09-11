import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * Accounts for the whole platform — Admins and Students, self-registered or
 * created at the counter (walk-in). Shape follows the `users` table in the data
 * model: Payload's auth adds `email` / `hash` / `salt`, and `timestamps` adds
 * `createdAt` / `updatedAt`; everything else is declared here.
 *
 * Email verification is NOT Payload's built-in token flow — it runs through the
 * OTP store in Redis, and `status` is the source of truth for whether an account
 * may sign in (`verifiedAt` only records when it happened).
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { vi: 'Người dùng', en: 'User' },
    plural: { vi: 'Người dùng', en: 'Users' },
  },
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['email', 'fullName', 'role', 'status'],
    useAsTitle: 'email',
  },
  auth: true,
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
      label: { vi: 'Số điện thoại', en: 'Phone Number' },
      maxLength: 30,
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: { vi: 'Ảnh đại diện', en: 'Avatar' },
    },
    {
      name: 'role',
      type: 'select',
      label: { vi: 'Vai trò', en: 'Role' },
      options: [
        { label: { vi: 'Quản trị viên (ADMIN)', en: 'Administrator (ADMIN)' }, value: 'ADMIN' },
        { label: { vi: 'Học viên (STUDENT)', en: 'Student (STUDENT)' }, value: 'STUDENT' },
      ],
      defaultValue: 'STUDENT',
      required: true,
      saveToJWT: true,
    },
    {
      name: 'status',
      type: 'select',
      label: { vi: 'Trạng thái tài khoản', en: 'Account Status' },
      options: [
        {
          label: { vi: 'Chờ xác thực OTP', en: 'Pending Verification' },
          value: 'PENDING_VERIFICATION',
        },
        { label: { vi: 'Đang hoạt động', en: 'Active' }, value: 'ACTIVE' },
        { label: { vi: 'Đã vô hiệu hóa', en: 'Disabled' }, value: 'DISABLED' },
      ],
      defaultValue: 'PENDING_VERIFICATION',
      required: true,
      saveToJWT: true,
    },
    {
      name: 'isWalkIn',
      type: 'checkbox',
      label: { vi: 'Tạo tại quầy', en: 'Walk-in Account' },
      defaultValue: false,
      admin: {
        description: {
          vi: 'Tài khoản do Admin tạo trực tiếp tại quầy, không qua tự đăng ký web.',
          en: 'Account created directly at the counter by Admin, not via self-registration.',
        },
      },
    },
    {
      name: 'verifiedAt',
      type: 'date',
      label: { vi: 'Thời điểm xác thực', en: 'Verified At' },
      admin: { readOnly: true },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      label: { vi: 'Đăng nhập lần cuối', en: 'Last Login At' },
      admin: { readOnly: true },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: { vi: 'Người tạo', en: 'Created By' },
      admin: {
        description: {
          vi: 'Admin đã tạo tài khoản này. Trống với tài khoản tự đăng ký.',
          en: 'Admin who created this account. Blank for self-registered users.',
        },
      },
    },
  ],
  timestamps: true,
}
