import type { Block, Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'

const columnFields: Field[] = [
  {
    type: 'row',
    fields: [
      {
        name: 'size',
        type: 'select',
        defaultValue: 'oneThird',
        label: { vi: 'Độ rộng cột', en: 'Column Width' },
        options: [
          { label: '1/3 (One Third)', value: 'oneThird' },
          { label: '1/2 (Half)', value: 'half' },
          { label: '2/3 (Two Thirds)', value: 'twoThirds' },
          { label: '100% (Full)', value: 'full' },
        ],
        admin: {
          width: '33.33%',
        },
      },
      {
        name: 'cardStyle',
        type: 'select',
        defaultValue: 'none',
        label: { vi: 'Kiểu dáng / Khung cột', en: 'Card Style' },
        options: [
          { label: { vi: 'Mặc định (Không khung)', en: 'None (Default)' }, value: 'none' },
          { label: { vi: 'Đóng khung Thẻ (Card)', en: 'Card' }, value: 'card' },
          { label: { vi: 'Khung nền dịu (Muted Box)', en: 'Muted Box' }, value: 'muted' },
          { label: { vi: 'Khung viền xanh (Brand Accent)', en: 'Brand Accent' }, value: 'primary' },
          { label: { vi: 'Khung nền tối (Dark Box)', en: 'Dark Box' }, value: 'dark' },
        ],
        admin: {
          width: '33.33%',
        },
      },
      {
        name: 'textColor',
        type: 'select',
        defaultValue: 'default',
        label: { vi: 'Màu chữ', en: 'Text Color' },
        options: [
          { label: { vi: 'Mặc định (Theo theme)', en: 'Default' }, value: 'default' },
          { label: { vi: 'Trắng sáng (White)', en: 'Bright White' }, value: 'white' },
          { label: { vi: 'Xanh thương hiệu (Primary)', en: 'Primary Blue' }, value: 'primary' },
          { label: { vi: 'Chữ mờ / Phụ (Muted)', en: 'Muted' }, value: 'muted' },
        ],
        admin: {
          width: '33.33%',
        },
      },
    ],
  },
  {
    name: 'richText',
    type: 'richText',
    editor: lexicalEditor({
      features: ({ rootFeatures }) => {
        return [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ]
      },
    }),
    label: false,
  },
  {
    name: 'enableLink',
    type: 'checkbox',
    label: { vi: 'Thêm nút liên kết', en: 'Enable Link' },
  },
  link({
    overrides: {
      admin: {
        condition: (_data, siblingData) => {
          return Boolean(siblingData?.enableLink)
        },
      },
    },
  }),
]

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  labels: {
    singular: { vi: 'Khối nội dung', en: 'Content' },
    plural: { vi: 'Khối nội dung', en: 'Content' },
  },
  fields: [
    {
      name: 'background',
      type: 'select',
      defaultValue: 'none',
      label: {
        vi: 'Màu nền toàn khối',
        en: 'Block Background',
      },
      options: [
        { label: { vi: 'Mặc định (Trong suốt)', en: 'Default (Transparent)' }, value: 'none' },
        { label: { vi: 'Nền xám/xanh dịu (Muted)', en: 'Muted Background' }, value: 'muted' },
        { label: { vi: 'Nền thẻ Card (Có viền & đổ bóng)', en: 'Card Box' }, value: 'card' },
        { label: { vi: 'Nền xanh thương hiệu (Primary)', en: 'Primary Brand' }, value: 'primary' },
        { label: { vi: 'Nền tối sâu (Dark Navy)', en: 'Dark Navy' }, value: 'dark' },
      ],
    },
    {
      name: 'columns',
      type: 'array',
      admin: {
        initCollapsed: true,
      },
      fields: columnFields,
    },
  ],
}
