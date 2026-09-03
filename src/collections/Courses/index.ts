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
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['title', 'courseType', 'duration', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Tên khóa học hiển thị',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Thông tin chung',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              label: 'Ảnh đại diện/Thumbnail khóa học (image_id)',
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              label: 'Mô tả ngắn gọn (short_description)',
              maxLength: 500,
            },
            {
              name: 'description',
              type: 'richText',
              label: 'Bài viết giới thiệu tổng quan chi tiết khóa học (description)',
            },
          ],
        },
        {
          label: 'Cấu hình đào tạo & Đăng ký',
          fields: [
            {
              name: 'duration',
              type: 'text',
              label: 'Thời lượng tổng quan của khóa học (duration)',
              maxLength: 100,
              admin: {
                placeholder: 'Ví dụ: 8 tuần, 24 buổi',
              },
            },
            {
              name: 'moodleUrl',
              type: 'text',
              label: 'Đường dẫn liên kết sang hệ thống Moodle (moodle_url)',
              admin: {
                condition: (data) => data?.courseType === 'MOODLE',
                placeholder: 'https://moodle.example.com/course/view.php?id=...',
                description: 'Chỉ hiển thị khi loại khóa học là MOODLE',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'registrationStartAt',
                  type: 'date',
                  label: 'Thời điểm bắt đầu cho phép học viên đăng ký (registration_start_at)',
                  admin: {
                    date: {
                      pickerAppearance: 'dayAndTime',
                    },
                    condition: (data) => data?.courseType === 'OFFLINE',
                    width: '50%',
                  },
                },
                {
                  name: 'registrationEndAt',
                  type: 'date',
                  label: 'Thời điểm đóng/kết thúc nhận đăng ký (registration_end_at)',
                  admin: {
                    date: {
                      pickerAppearance: 'dayAndTime',
                    },
                    condition: (data) => data?.courseType === 'OFFLINE',
                    width: '50%',
                  },
                },
              ],
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
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),
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
      name: 'courseType',
      type: 'select',
      label: 'Loại khóa học (course_type)',
      required: true,
      defaultValue: 'OFFLINE',
      options: [
        {
          label: 'MOODLE (Miễn phí, chỉ redirect sang hệ thống Moodle ngoài)',
          value: 'MOODLE',
        },
        {
          label: 'OFFLINE (Học viên đăng ký trên web, Admin xếp lớp)',
          value: 'OFFLINE',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    slugField(),
  ],
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
