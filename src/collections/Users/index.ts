import type { CollectionConfig } from 'payload'

import { adminGroups } from '@/lib/constants/adminGroups'
import { authenticated } from '../../access/authenticated'

/**
 * Internal staff, and nothing else. This is `admin.user`: a document here is the
 * only kind of principal Payload will admit to `/admin`, and it owns the
 * `payload-token` cookie. Students live in their own collection and never appear
 * here — see `src/collections/Students/index.ts`.
 *
 * `fullName` is not a leftover from that split. `populateAuthors` copies it onto
 * `post.populatedAuthors`, which is the only field the public byline reads, so
 * removing it renders every byline blank with nothing raised anywhere. See
 * INVARIANTS.
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
    group: 'Users & Security',
    defaultColumns: ['email', 'fullName'],
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
  ],
  timestamps: true,
}
