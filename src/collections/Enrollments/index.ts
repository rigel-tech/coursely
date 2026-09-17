import type { CollectionConfig } from 'payload'
import { adminGroups } from '@/lib/constants/adminGroups'
import { relationshipId } from '@/utilities/relationshipId'
import { authenticated } from '../../access/authenticated'
import { guardClassCapacity } from './hooks/guardClassCapacity'
import { setClassAssignedAt } from './hooks/setClassAssignedAt'
import { setCreatedBy } from './hooks/setCreatedBy'

/** A class that has been cancelled or has already finished can take nobody new. */
const DEAD_CLASS_STATUSES = ['CANCELLED', 'COMPLETED']

export const Enrollments: CollectionConfig<'enrollments'> = {
  slug: 'enrollments',
  hooks: {
    beforeChange: [setCreatedBy, guardClassCapacity, setClassAssignedAt],
  },
  labels: {
    singular: { vi: 'Đơn đăng ký', en: 'Enrollment' },
    plural: { vi: 'Đơn đăng ký', en: 'Enrollments' },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: adminGroups.academic,
    defaultColumns: ['student', 'course', 'enrollmentStatus', 'paymentStatus', 'updatedAt'],
    useAsTitle: 'student',
  },
  fields: [
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'students',
      label: { vi: 'Học viên', en: 'Student' },
      required: true,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      label: { vi: 'Khóa học', en: 'Course' },
      required: true,
    },
    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      label: { vi: 'Lớp học', en: 'Class' },
      // Narrows what the edit view offers; it is not the guard. Payload passes an empty
      // `data` when this runs for a list-view filter, and a REST caller never runs it at all
      // — `guardClassCapacity` is what actually refuses a class from another course.
      filterOptions: ({ data }) => {
        const course = relationshipId(data?.course)
        if (!course) return false

        return {
          course: { equals: course },
          status: { not_in: DEAD_CLASS_STATUSES },
        }
      },
    },
    {
      name: 'enrollmentStatus',
      type: 'select',
      label: { vi: 'Trạng thái đăng ký', en: 'Enrollment Status' },
      required: true,
      defaultValue: 'NEW',
      options: [
        { label: { vi: 'Mới đăng ký', en: 'New' }, value: 'NEW' },
        { label: { vi: 'Đã xác nhận', en: 'Confirmed' }, value: 'CONFIRMED' },
        { label: { vi: 'Đã vào học', en: 'Attended' }, value: 'ATTENDED' },
        { label: { vi: 'Đã hoàn thành', en: 'Completed' }, value: 'COMPLETED' },
        { label: { vi: 'Đã hủy', en: 'Cancelled' }, value: 'CANCELLED' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      label: { vi: 'Trạng thái học phí', en: 'Payment Status' },
      required: true,
      defaultValue: 'UNPAID',
      options: [
        { label: { vi: 'Chưa thanh toán', en: 'Unpaid' }, value: 'UNPAID' },
        {
          label: { vi: 'Đã thanh toán một phần', en: 'Partially paid' },
          value: 'PARTIALLY_PAID',
        },
        { label: { vi: 'Đã thanh toán đủ', en: 'Paid' }, value: 'PAID' },
        { label: { vi: 'Đã hủy / hoàn tiền', en: 'Cancelled / Refunded' }, value: 'CANCELLED' },
      ],
    },
    {
      name: 'registrationSource',
      type: 'select',
      label: { vi: 'Nguồn đăng ký', en: 'Registration Source' },
      required: true,
      defaultValue: 'ADMIN_CREATED',
      options: [
        { label: { vi: 'Tự đăng ký', en: 'Self-registration' }, value: 'SELF_REGISTRATION' },
        { label: { vi: 'Admin tạo', en: 'Admin-created' }, value: 'ADMIN_CREATED' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'registeredAt',
      type: 'date',
      label: { vi: 'Thời điểm đăng ký', en: 'Registered At' },
      required: true,
      defaultValue: () => new Date(),
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm:ss',
          timeIntervals: 1,
        },
      },
    },
    {
      name: 'confirmedAt',
      type: 'date',
      label: { vi: 'Thời điểm xác nhận', en: 'Confirmed At' },
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm:ss',
          timeIntervals: 1,
        },
      },
    },
    {
      name: 'classAssignedAt',
      type: 'date',
      label: { vi: 'Thời điểm xếp lớp', en: 'Class Assigned At' },
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm:ss',
          timeIntervals: 1,
        },
      },
    },
    {
      name: 'cancelledAt',
      type: 'date',
      label: { vi: 'Thời điểm hủy', en: 'Cancelled At' },
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm:ss',
          timeIntervals: 1,
        },
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: { vi: 'Admin tạo đơn', en: 'Created By' },
      admin: {
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}
