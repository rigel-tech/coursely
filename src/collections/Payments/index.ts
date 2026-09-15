import type { CollectionConfig, Validate } from 'payload'

import { adminGroups } from '@/lib/constants/adminGroups'
import { authenticated } from '../../access/authenticated'
import { setPaymentDate } from './hooks/setPaymentDate'

/**
 * `decimal(12,0)` in the source schema — whole VND, no cents. `admin.step: 1` only
 * shapes the browser stepper; this is the server-side guard that rejects a
 * non-integer amount arriving over the REST/GraphQL/Local API.
 */
export const validatePaymentAmount: Validate<number> = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Số tiền là bắt buộc.'
  if (!Number.isInteger(value)) return 'Số tiền phải là số nguyên, không có phần thập phân.'
  if (value < 1) return 'Số tiền phải lớn hơn 0.'
  return true
}

/**
 * Records each payment a student makes toward an enrollment. `enrollmentId` is
 * a plain number — no relationship to `enrollments` yet at this stage (wiring
 * that FK is a later feature). `studentId` and `userId` are real relationships,
 * to `students` and `users`. `payment_status` (an enrollment's aggregate
 * paid/partial/cancelled state) does not belong to this collection — it is
 * derived from the sum of payments, not a property of a single payment.
 */
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
    beforeChange: [setPaymentDate],
  },
  fields: [
    {
      name: 'enrollmentId',
      type: 'number',
      label: { vi: 'Mã đơn đăng ký', en: 'Enrollment ID' },
      required: true,
    },
    {
      name: 'studentId',
      type: 'relationship',
      relationTo: 'students',
      label: { vi: 'Học viên', en: 'Student' },
      required: true,
      admin: {
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
        description: {
          vi: 'Nhân sự đã trực tiếp ghi nhận khoản thu này. Để trống nếu không xác định.',
          en: 'Staff member who recorded this payment. Leave blank if unknown.',
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
