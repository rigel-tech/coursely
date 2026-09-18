import type { CollectionConfig } from 'payload'
import { adminGroups } from '@/lib/constants/adminGroups'
import { authenticated } from '../../access/authenticated'
import { deriveClassAssignedAt } from './hooks/deriveClassAssignedAt'
import { deriveEnrollmentPaymentStatus } from './hooks/deriveEnrollmentPaymentStatus'
import { deriveEnrollmentStatusTimestamps } from './hooks/deriveEnrollmentStatusTimestamps'
import { guardAgainstDeleteWithPayments } from './hooks/guardAgainstDeleteWithPayments'
import { setCreatedBy } from './hooks/setCreatedBy'

export const Enrollments: CollectionConfig<'enrollments'> = {
  slug: 'enrollments',
  hooks: {
    beforeChange: [
      setCreatedBy,
      deriveEnrollmentPaymentStatus,
      deriveEnrollmentStatusTimestamps,
      deriveClassAssignedAt,
    ],
    beforeDelete: [guardAgainstDeleteWithPayments],
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
      // Settable only at creation — locked afterward so an enrollment can never be
      // silently re-pointed at a different student post-hoc.
      access: { update: () => false },
      admin: {
        description: {
          vi: 'Chỉ chọn được khi tạo mới — không đổi được sau khi đã lưu.',
          en: 'Selectable only when creating — cannot be changed once saved.',
        },
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      label: { vi: 'Khóa học', en: 'Course' },
      required: true,
      // Settable only at creation — see `student` above.
      access: { update: () => false },
      admin: {
        description: {
          vi: 'Chỉ chọn được khi tạo mới — không đổi được sau khi đã lưu.',
          en: 'Selectable only when creating — cannot be changed once saved.',
        },
      },
    },
    {
      name: 'class',
      type: 'relationship',
      relationTo: 'classes',
      label: { vi: 'Lớp học', en: 'Class' },
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
        { label: { vi: 'Đã thanh toán', en: 'Paid' }, value: 'PAID' },
      ],
      admin: {
        readOnly: true,
        description: {
          vi: 'Tự động suy ra: có thanh toán thì "Đã thanh toán", chưa có thì "Chưa thanh toán" — không chọn tay được.',
          en: 'Automatically derived: PAID once a payment exists, UNPAID otherwise — not manually selectable.',
        },
      },
    },
    {
      name: 'payments',
      type: 'join',
      collection: 'payments',
      on: 'enrollmentId',
      label: { vi: 'Thanh toán', en: 'Payments' },
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
        description: {
          vi: 'Tự động lấy theo tài khoản admin đang tạo đơn — hiện sẵn trước khi lưu, không chọn tay được.',
          en: 'Automatically set to the admin account creating this enrollment — shown before saving, not manually selectable.',
        },
        components: {
          Field: '@/collections/Enrollments/components/CreatedByField#CreatedByField',
        },
      },
    },
  ],
  timestamps: true,
}
