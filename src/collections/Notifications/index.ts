import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * In-app notifications shown to a student. The registration flow writes an
 * `ACCOUNT_CREATED` row inside the same transaction as the new account — a
 * student must never exist without its welcome notification — so `student` is
 * required. More `type` values are added as other features raise notifications.
 *
 * The field is `student`, not `user`: this repo has both a `users` collection
 * (staff) and a `students` one, and notifications are addressed to the public
 * site. Staff never receive them.
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
    group: 'Users & Security',
    defaultColumns: ['title', 'student', 'type', 'isRead', 'createdAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
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
