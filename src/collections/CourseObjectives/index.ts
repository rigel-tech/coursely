import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

export const CourseObjectives: CollectionConfig<'course-objectives'> = {
  slug: 'course-objectives',
  labels: {
    singular: { vi: 'Mục tiêu khóa học', en: 'Course Objective' },
    plural: { vi: 'Mục tiêu khóa học', en: 'Course Objectives' },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    group: {
      vi: 'Khóa học & Đào tạo',
      en: 'Academic',
    },
    defaultColumns: ['title', 'course', 'sortOrder', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { vi: 'Tiêu đề mục tiêu đầu ra', en: 'Objective Title' },
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: { vi: 'Mô tả chi tiết mục tiêu', en: 'Objective Description' },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      label: { vi: 'Thuộc khóa học', en: 'Course' },
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: { vi: 'Thứ tự hiển thị', en: 'Sort Order' },
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
