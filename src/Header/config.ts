import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/components/admin/RowLabel/Header#RowLabel',
        },
      },
      fields: [
        link({
          appearances: false,
        }),
        {
          name: 'subMenuItems',
          label: 'Menu con (Submenu)',
          type: 'array',
          fields: [
            link({
              appearances: false,
            }),
          ],
          admin: {
            initCollapsed: true,
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
