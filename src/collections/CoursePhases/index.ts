import type { CollectionConfig } from 'payload'

import { adminGroups } from '@/lib/constants/adminGroups'
import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import {
  revalidateParentCourse,
  revalidateParentCourseDelete,
} from '../Courses/hooks/revalidateCourse'

export const CoursePhases: CollectionConfig<'course-phases'> = {
  slug: 'course-phases',
  labels: {
    singular: { vi: 'Giai đoạn khóa học', en: 'Course Phase' },
    plural: { vi: 'Giai đoạn khóa học', en: 'Course Phases' },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    group: adminGroups.academic,
    defaultColumns: ['title', 'course', 'sortOrder', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { vi: 'Tên giai đoạn / lộ trình', en: 'Phase Title' },
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      label: { vi: 'Nội dung chi tiết giai đoạn', en: 'Phase Description' },
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
  hooks: {
    afterChange: [revalidateParentCourse],
    afterDelete: [revalidateParentCourseDelete],
  },
}
