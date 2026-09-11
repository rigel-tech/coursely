import type { CollectionConfig } from 'payload'

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
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Academic',
    defaultColumns: ['code', 'course', 'status', 'startDate', 'maxStudents', 'updatedAt'],
    useAsTitle: 'code',
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      label: 'Mã lớp/Tên phân biệt lớp (code)',
      required: true,
      unique: true,
      maxLength: 100,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      label: 'Lớp học này mở cho khóa học nào (course_id)',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái hiện tại của lớp (status)',
      required: true,
      defaultValue: 'DRAFT',
      options: [
        { label: 'DRAFT — Lớp nháp, chưa mở', value: 'DRAFT' },
        { label: 'OPEN — Đang mở, có thể xếp học viên vào', value: 'OPEN' },
        { label: 'CLOSED — Đã đóng (đủ chỗ hoặc dừng nhận)', value: 'CLOSED' },
        { label: 'COMPLETED — Lớp đã học xong', value: 'COMPLETED' },
        { label: 'CANCELLED — Lớp bị hủy', value: 'CANCELLED' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          type: 'date',
          label: 'Ngày dự kiến khai giảng lớp (start_date)',
          required: true,
          admin: {
            date: { pickerAppearance: 'dayOnly' },
            width: '50%',
          },
        },
        {
          name: 'endDate',
          type: 'date',
          label: 'Ngày dự kiến kết thúc lớp (end_date)',
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
      label: 'Lịch học chi tiết hàng tuần (schedule_time)',
      maxLength: 255,
      admin: {
        placeholder: 'Ví dụ: Thứ 2-4-6, 18:00–20:00',
      },
    },
    {
      name: 'location',
      type: 'text',
      label: 'Địa điểm/Phòng học tổ chức (location)',
      maxLength: 255,
    },
    {
      name: 'maxStudents',
      type: 'number',
      label: 'Sức chứa học viên tối đa của lớp học này (max_students)',
      required: true,
      // Không có trong lược đồ, nhưng sức chứa ≤ 0 là dữ liệu vô nghĩa.
      min: 1,
      admin: {
        position: 'sidebar',
        step: 1,
      },
    },
  ],
}
