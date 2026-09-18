import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * In-app notifications for both audiences this app has: students (public site) and
 * staff (`/admin`). `student` set means that one student's own notification; `student`
 * absent means staff-facing, broadcast to every signed-in staff member — there is no
 * separate field for audience, its presence/absence *is* the audience
 * (specs/011-admin-notification-bell). `user` is a plain FK to a staff user — it plays no
 * part in audience determination. More `type` values are added as other features raise
 * notifications.
 */
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: {
    singular: { vi: 'Thông báo', en: 'Notification' },
    plural: { vi: 'Thông báo', en: 'Notifications' },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Users & Security',
    defaultColumns: ['title', 'student', 'type', 'isRead', 'createdAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      label: { vi: 'Loại thông báo', en: 'Type' },
      options: [
        {
          label: { vi: 'Tạo tài khoản thành công', en: 'Account Created' },
          value: 'ACCOUNT_CREATED',
        },
        {
          label: { vi: 'Đăng ký khóa học thành công', en: 'Enrollment Created' },
          value: 'ENROLLMENT_CREATED',
        },
        {
          label: { vi: 'Đã hủy đăng ký khóa học', en: 'Enrollment Cancelled' },
          value: 'ENROLLMENT_CANCELLED',
        },
        {
          label: { vi: 'Đơn đăng ký đã được xác nhận', en: 'Enrollment Confirmed' },
          value: 'ENROLLMENT_CONFIRMED',
        },
      ],
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      label: { vi: 'Tiêu đề', en: 'Title' },
      required: true,
      maxLength: 255,
    },
    {
      name: 'content',
      type: 'textarea',
      label: { vi: 'Nội dung', en: 'Content' },
      required: true,
    },
    {
      name: 'metadata',
      type: 'json',
      label: { vi: 'Dữ liệu ngữ cảnh', en: 'Metadata' },
    },
    {
      name: 'isRead',
      type: 'checkbox',
      label: { vi: 'Đã đọc', en: 'Is Read' },
      defaultValue: false,
      index: true,
    },
  ],
  timestamps: true,
}
