import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { slugField } from 'payload'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Courses: CollectionConfig<'courses'> = {
  slug: 'courses',
  labels: {
    singular: { vi: 'Khóa học', en: 'Course' },
    plural: { vi: 'Khóa học', en: 'Courses' },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'category', 'courseType', 'duration', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { vi: 'Tên khóa học', en: 'Course Title' },
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: { vi: 'Thông tin chung', en: 'General Info' },
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              label: { vi: 'Ảnh đại diện khóa học', en: 'Thumbnail Image' },
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              label: { vi: 'Mô tả ngắn', en: 'Short Description' },
              maxLength: 500,
            },
            {
              name: 'description',
              type: 'richText',
              label: { vi: 'Mô tả chi tiết khóa học', en: 'Detailed Description' },
            },
          ],
        },
        {
          label: { vi: 'Cấu hình đào tạo & Đăng ký', en: 'Training & Registration Config' },
          fields: [
            {
              name: 'duration',
              type: 'text',
              label: { vi: 'Thời lượng khóa học', en: 'Duration' },
              maxLength: 100,
              admin: {
                placeholder: 'Ví dụ: 8 tuần, 24 buổi',
              },
            },
            {
              name: 'moodleUrl',
              type: 'text',
              label: { vi: 'Đường dẫn Moodle', en: 'Moodle URL' },
              admin: {
                condition: (data) => data?.courseType === 'MOODLE',
                placeholder: 'https://moodle.example.com/course/view.php?id=...',
                description: {
                  vi: 'Chỉ hiển thị khi loại khóa học là MOODLE',
                  en: 'Only shown when course type is MOODLE',
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'registrationStartAt',
                  type: 'date',
                  label: { vi: 'Thời điểm bắt đầu nhận đăng ký', en: 'Registration Starts At' },
                  admin: {
                    date: { pickerAppearance: 'dayAndTime' },
                    condition: (data) => data?.courseType === 'OFFLINE',
                    width: '50%',
                  },
                },
                {
                  name: 'registrationEndAt',
                  type: 'date',
                  label: { vi: 'Thời điểm kết thúc nhận đăng ký', en: 'Registration Ends At' },
                  admin: {
                    date: { pickerAppearance: 'dayAndTime' },
                    condition: (data) => data?.courseType === 'OFFLINE',
                    width: '50%',
                  },
                },
              ],
            },
          ],
        },
        {
          label: { vi: 'Mục tiêu & Lộ trình', en: 'Objectives & Phases' },
          fields: [
            {
              name: 'objectives',
              type: 'join',
              collection: 'course-objectives',
              on: 'course',
              label: { vi: 'Mục tiêu đầu ra', en: 'Course Objectives' },
            },
            {
              name: 'phases',
              type: 'join',
              collection: 'course-phases',
              on: 'course',
              label: { vi: 'Lộ trình các giai đoạn', en: 'Course Phases' },
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: true }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      label: { vi: 'Danh mục khóa học', en: 'Course Category' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'tags',
      type: 'array',
      label: { vi: 'Thẻ tag', en: 'Tags' },
      fields: [
        {
          name: 'tag',
          type: 'text',
          label: { vi: 'Tên thẻ', en: 'Tag' },
          required: true,
        },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'courseType',
      type: 'select',
      label: { vi: 'Loại khóa học', en: 'Course Type' },
      required: true,
      defaultValue: 'OFFLINE',
      options: [
        {
          label: {
            vi: 'MOODLE (Miễn phí, chuyển hướng sang Moodle ngoài)',
            en: 'MOODLE (Free, redirects to external Moodle)',
          },
          value: 'MOODLE',
        },
        {
          label: {
            vi: 'OFFLINE (Đăng ký trực tiếp, Admin xếp lớp)',
            en: 'OFFLINE (In-person, enrolled via website)',
          },
          value: 'OFFLINE',
        },
      ],
      admin: { position: 'sidebar' },
    },
    slugField(),
  ],
  versions: {
    drafts: {
      autosave: { interval: 100 },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
