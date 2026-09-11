import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * In-app notifications shown to a user. The registration flow writes an
 * `ACCOUNT_CREATED` row inside the same transaction as the new user — a user
 * must never exist without its welcome notification — so `user` is required.
 * More `type` values are added as other features raise notifications.
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
    defaultColumns: ['title', 'user', 'type', 'isRead', 'createdAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: { vi: 'Người nhận', en: 'Recipient' },
      required: true,
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
