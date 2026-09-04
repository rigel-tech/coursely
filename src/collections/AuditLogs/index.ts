import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * Append-only security trail (§7). Written by server-side flows through the Local
 * API; never created, edited or deleted from the public site. `user` is optional
 * because some events (a rejected login for an unknown email) have no account to
 * point at. More `action` values are added as other flows start logging.
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  access: {
    create: () => false,
    delete: () => false,
    read: authenticated,
    update: () => false,
  },
  admin: {
    defaultColumns: ['action', 'user', 'ip', 'createdAt'],
    useAsTitle: 'action',
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      options: ['LOGIN_SUCCESS'],
      required: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'ip',
      type: 'text',
      required: true,
    },
    {
      name: 'userAgent',
      type: 'text',
      required: true,
    },
  ],
  timestamps: true,
}
