import type { CollectionConfig, Validate } from 'payload'
import { adminGroups } from '@/lib/constants/adminGroups'
import { authenticated } from '../../access/authenticated'
import { populatePaymentRelations } from './hooks/populatePaymentRelations'
import { setPaymentDate } from './hooks/setPaymentDate'
import { setRecordedByUser } from './hooks/setRecordedByUser'
import { setStudentFromEnrollment } from './hooks/setStudentFromEnrollment'

export const validatePaymentAmount: Validate<number> = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Số tiền là bắt buộc.'
  if (!Number.isInteger(value)) return 'Số tiền phải là số nguyên, không có phần thập phân.'
  if (value < 1) return 'Số tiền phải lớn hơn 0.'
  return true
}

export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: {
    singular: { vi: 'Thanh toán', en: 'Payment' },
    plural: { vi: 'Thanh toán', en: 'Payments' },
  },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: adminGroups.academic,
    hidden: true,
    defaultColumns: [
      'studentId',
      'userId',
      'enrollmentId',
      'amount',
      'paymentMethod',
      'paymentDate',
    ],
  },
  hooks: {
    beforeChange: [setPaymentDate, setRecordedByUser, setStudentFromEnrollment],
    afterRead: [populatePaymentRelations],
  },
  fields: [
    {
      name: 'enrollmentId',
      type: 'relationship',
      relationTo: 'enrollments',
      label: { vi: 'Mã đơn đăng ký', en: 'Enrollment ID' },
      required: true,
      admin: {
        readOnly: true,
        description: {
          vi: 'Được điền sẵn từ đơn đăng ký đang xem, không chọn tay được.',
          en: 'Pre-filled from the enrollment being viewed — not manually selectable.',
        },
        components: {
          Cell: '@/collections/Payments/components/EnrollmentCell#EnrollmentCell',
        },
      },
    },
    {
      name: 'studentId',
      type: 'relationship',
      relationTo: 'students',
      label: { vi: 'Học viên', en: 'Student' },
      required: true,
      admin: {
        readOnly: true,
        description: {
          vi: 'Tự động lấy theo học viên của đơn đăng ký, không chọn tay được.',
          en: 'Automatically taken from the enrollment’s own student — not manually selectable.',
        },
        components: {
          Cell: '@/collections/Payments/components/StudentCell#StudentCell',
        },
      },
    },
    {
      name: 'amount',
      type: 'number',
      label: { vi: 'Số tiền (VND)', en: 'Amount (VND)' },
      required: true,
      min: 1,
      admin: {
        step: 1,
        components: {
          Field: '@/collections/Payments/components/AmountField#AmountField',
          Cell: '@/collections/Payments/components/AmountCell#AmountCell',
        },
      },
      validate: validatePaymentAmount,
    },
    {
      name: 'paymentMethod',
      type: 'select',
      label: { vi: 'Phương thức thanh toán', en: 'Payment Method' },
      required: true,
      options: [
        { label: { vi: 'Tiền mặt', en: 'Cash' }, value: 'CASH' },
        { label: { vi: 'Chuyển khoản ngân hàng', en: 'Bank Transfer' }, value: 'BANK_TRANSFER' },
        { label: { vi: 'Quẹt thẻ tại quầy', en: 'Card' }, value: 'CARD' },
        { label: { vi: 'Khác', en: 'Other' }, value: 'OTHER' },
      ],
    },
    {
      name: 'paymentDate',
      type: 'date',
      label: { vi: 'Thời điểm thanh toán', en: 'Payment Date' },
      required: true,
      admin: {
        readOnly: true,
        description: {
          vi: 'Tự động ghi theo thời điểm lưu, không nhập tay được.',
          en: 'Automatically set to the moment the record is saved — not manually entered.',
        },
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy HH:mm:ss',
          timeIntervals: 1,
        },
      },
    },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      label: { vi: 'Người ghi nhận', en: 'Recorded By' },
      admin: {
        readOnly: true,
        description: {
          vi: 'Tự động ghi theo tài khoản nhân sự đang tạo bản ghi này, không chọn tay được.',
          en: 'Automatically set to the staff account creating this record — not manually selectable.',
        },
        components: {
          Cell: '@/collections/Payments/components/RecorderCell#RecorderCell',
        },
      },
    },
    {
      name: 'referenceNote',
      type: 'textarea',
      label: { vi: 'Ghi chú', en: 'Reference Note' },
      admin: {
        description: {
          vi: 'Số biên lai, nội dung chuyển khoản, hoặc ghi chú bổ sung khác.',
          en: 'Receipt number, transfer memo, or other supplementary note.',
        },
      },
    },
    {
      name: 'proofImage',
      type: 'upload',
      relationTo: 'media',
      label: { vi: 'Ảnh bằng chứng thanh toán', en: 'Proof of Payment' },
      admin: {
        description: {
          vi: 'Ảnh chụp màn hình chuyển khoản thành công hoặc biên lai.',
          en: 'Screenshot of a successful transfer or a receipt photo.',
        },
      },
    },
  ],
  timestamps: true,
}
