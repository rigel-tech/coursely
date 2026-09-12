import type { CollectionConfig } from 'payload'

import { adminGroups } from '@/lib/constants/adminGroups'
import { authenticated } from '../../access/authenticated'

/**
 * Append-only security trail (§7). Written by server-side flows through the Local
 * API; never created, edited or deleted from the public site. `user` is optional
 * because some events (a rejected login for an unknown email) have no account to
 * point at. More `action` values are added as other flows start logging.
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: {
    singular: { vi: 'Nhật ký bảo mật', en: 'Audit Log' },
    plural: { vi: 'Nhật ký bảo mật', en: 'Audit Logs' },
  },
  access: {
    create: () => false,
    delete: () => false,
    read: authenticated,
    update: () => false,
  },
  admin: {
    group: adminGroups.usersSecurity,
    defaultColumns: ['action', 'user', 'ip', 'createdAt'],
    useAsTitle: 'action',
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      label: { vi: 'Hành động', en: 'Action' },
      options: [
        { label: { vi: 'Đăng nhập thành công', en: 'Login Success' }, value: 'LOGIN_SUCCESS' },
        { label: { vi: 'Đăng xuất', en: 'Logout' }, value: 'LOGOUT' },
        { label: { vi: 'Đăng xuất tất cả thiết bị', en: 'Logout All' }, value: 'LOGOUT_ALL' },
        { label: { vi: 'Tái sử dụng token làm mới', en: 'Refresh Reuse' }, value: 'REFRESH_REUSE' },
      ],
      required: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: { vi: 'Người dùng liên quan', en: 'User' },
      index: true,
    },
    {
      name: 'ip',
      type: 'text',
      label: { vi: 'Địa chỉ IP', en: 'IP Address' },
      required: true,
    },
    {
      name: 'userAgent',
      type: 'text',
      label: { vi: 'Trình duyệt (User Agent)', en: 'User Agent' },
      required: true,
    },
  ],
  timestamps: true,
}
