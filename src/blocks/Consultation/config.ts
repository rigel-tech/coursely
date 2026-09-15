import type { Block } from 'payload'

export const Consultation: Block = {
  slug: 'consultation',
  interfaceName: 'ConsultationBlock',
  labels: {
    singular: { vi: 'Khối Đăng ký tư vấn', en: 'Consultation Block' },
    plural: { vi: 'Khối Đăng ký tư vấn', en: 'Consultation Blocks' },
  },
  fields: [
    {
      name: 'badge',
      type: 'text',
      label: { vi: 'Nhãn phụ (Badge)', en: 'Badge' },
      admin: {
        placeholder: 'Ví dụ: ĐĂNG KÝ TƯ VẤN',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: { vi: 'Tiêu đề chính', en: 'Title' },
      required: true,
      admin: {
        placeholder: 'Ví dụ: Nhận lộ trình học riêng trong 24 giờ',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: { vi: 'Mô tả', en: 'Description' },
      admin: {
        placeholder:
          'Ví dụ: Để lại thông tin, chuyên viên học vụ sẽ gọi lại, kiểm tra trình độ nói miễn phí 15 phút và đề xuất khóa học phù hợp.',
      },
    },
    {
      name: 'steps',
      type: 'array',
      label: { vi: 'Các bước lộ trình / Quyền lợi', en: 'Steps' },
      fields: [
        {
          name: 'text',
          type: 'text',
          label: { vi: 'Nội dung bước', en: 'Step Content' },
          required: true,
          admin: {
            placeholder: 'Ví dụ: Kiểm tra trình độ nói miễn phí với giảng viên',
          },
        },
      ],
    },
    {
      name: 'note',
      type: 'text',
      label: { vi: 'Ghi chú / Cam kết', en: 'Note / Commitment' },
      admin: {
        placeholder:
          'Ví dụ: Trung tâm không thu học phí trực tuyến. Học phí được xác nhận và thanh toán tại quầy học vụ sau khi bạn chốt lớp.',
      },
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      label: { vi: 'Chọn Biểu mẫu (Form)', en: 'Select Form' },
    },
    {
      name: 'hotline',
      type: 'text',
      label: { vi: 'Số điện thoại Hotline', en: 'Hotline' },
      admin: {
        placeholder: 'Ví dụ: 1900 6789',
      },
    },
  ],
}
