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
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'user', 'type', 'isRead', 'createdAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      options: ['ACCOUNT_CREATED'],
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 255,
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Ngữ cảnh tạo thông báo, ví dụ { ip, userAgent }.',
      },
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
  ],
  timestamps: true,
}
