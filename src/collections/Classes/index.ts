import type { CollectionConfig } from 'payload'

import { adminGroups } from '@/lib/constants/adminGroups'
import { authenticated } from '../../access/authenticated'

/**
 * Lớp học (classes) — một buổi/khoá mở lớp cụ thể của một `courses`, do Admin xếp
 * lịch. Mirror `CoursePhases`: quan hệ bắt buộc tới `courses`, nhãn tiếng Việt kèm
 * tên cột DB. Không public — trạng thái DRAFT/CANCELLED là việc điều hành nội bộ,
 * nên toàn bộ quyền là `authenticated`.
 *
 * `created_at` / `updated_at` trong lược đồ ⇒ `timestamps` mặc định của Payload
 * (`createdAt` / `updatedAt`); không khai báo tay. `id` tự tăng là mặc định của
 * adapter Postgres ở dự án này.
 */
export const Classes: CollectionConfig<'classes'> = {
  slug: 'classes',
  labels: {
    singular: { vi: 'Lớp học', en: 'Class' },
    plural: { vi: 'Lớp học', en: 'Classes' },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: adminGroups.academic,
    defaultColumns: ['code', 'course', 'status', 'startDate', 'maxStudents', 'updatedAt'],
    useAsTitle: 'code',
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      label: { vi: 'Mã lớp', en: 'Class Code' },
      required: true,
      unique: true,
      maxLength: 100,
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
      name: 'status',
      type: 'select',
      label: { vi: 'Trạng thái lớp', en: 'Class Status' },
      required: true,
      defaultValue: 'DRAFT',
      options: [
        { label: { vi: 'DRAFT — Lớp nháp, chưa mở', en: 'DRAFT — Draft' }, value: 'DRAFT' },
        { label: { vi: 'OPEN — Đang mở nhận học viên', en: 'OPEN — Open' }, value: 'OPEN' },
        {
          label: { vi: 'CLOSED — Đã đóng (hết chỗ/dừng nhận)', en: 'CLOSED — Closed' },
          value: 'CLOSED',
        },
        {
          label: { vi: 'COMPLETED — Đã hoàn thành', en: 'COMPLETED — Completed' },
          value: 'COMPLETED',
        },
        {
          label: { vi: 'CANCELLED — Lớp bị hủy', en: 'CANCELLED — Cancelled' },
          value: 'CANCELLED',
        },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          type: 'date',
          label: { vi: 'Ngày khai giảng dự kiến', en: 'Start Date' },
          required: true,
          admin: {
            date: { pickerAppearance: 'dayOnly' },
            width: '50%',
          },
        },
        {
          name: 'endDate',
          type: 'date',
          label: { vi: 'Ngày kết thúc dự kiến', en: 'End Date' },
          admin: {
            date: { pickerAppearance: 'dayOnly' },
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'scheduleTime',
      type: 'text',
      label: { vi: 'Lịch học chi tiết', en: 'Weekly Schedule' },
      maxLength: 255,
      admin: {
        placeholder: 'Ví dụ: Thứ 2-4-6, 18:00–20:00',
      },
    },
    {
      name: 'location',
      type: 'text',
      label: { vi: 'Địa điểm / Phòng học', en: 'Location / Room' },
      maxLength: 255,
    },
    {
      name: 'maxStudents',
      type: 'number',
      label: { vi: 'Số lượng học viên tối đa', en: 'Max Students' },
      required: true,
      min: 1,
      admin: {
        position: 'sidebar',
        step: 1,
      },
    },
    {
      name: 'roster',
      type: 'ui',
      label: { vi: 'Xếp lớp', en: 'Roster' },
      admin: {
        components: {
          Field: '@/components/admin/ClassRoster#ClassRoster',
        },
      },
    },
  ],
}
