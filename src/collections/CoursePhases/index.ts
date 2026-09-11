import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

export const CoursePhases: CollectionConfig<'course-phases'> = {
  slug: 'course-phases',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    group: 'Academic',
    defaultColumns: ['title', 'course', 'sortOrder', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Tên giai đoạn/lộ trình (title)',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Nội dung chi tiết về lượng kiến thức và hoạt động trong giai đoạn (description)',
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      label: 'Thuộc về khóa học (course_id)',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Số thứ tự theo tiến trình học (sort_order)',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
