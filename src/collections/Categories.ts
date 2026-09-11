import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: { vi: 'Danh mục', en: 'Category' },
    plural: { vi: 'Danh mục', en: 'Categories' },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { vi: 'Tên danh mục', en: 'Category Title' },
      required: true,
    },
    slugField({
      position: undefined,
    }),
  ],
}
