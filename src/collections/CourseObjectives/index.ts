import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

export const CourseObjectives: CollectionConfig<'course-objectives'> = {
  slug: 'course-objectives',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'course', 'sortOrder', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Nội dung/Tiêu đề mục tiêu đầu ra',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Mô tả chi tiết hơn về mục tiêu học tập (description)',
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
      label: 'Số thứ tự sắp xếp hiển thị (sort_order)',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
