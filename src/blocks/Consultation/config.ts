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
      defaultValue: 'ĐĂNG KÝ TƯ VẤN',
    },
    {
      name: 'title',
      type: 'text',
      label: { vi: 'Tiêu đề chính', en: 'Title' },
      defaultValue: 'Nhận lộ trình học riêng trong 24 giờ',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: { vi: 'Mô tả', en: 'Description' },
      defaultValue:
        'Để lại thông tin, chuyên viên học vụ sẽ gọi lại, kiểm tra trình độ nói miễn phí 15 phút và đề xuất khóa học phù hợp.',
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
        },
      ],
      defaultValue: [
        { text: 'Kiểm tra trình độ nói miễn phí với giảng viên' },
        { text: 'Nhận lộ trình & lịch lớp phù hợp giờ làm của bạn' },
        { text: 'Học thử 1 buổi trước khi quyết định đăng ký' },
      ],
    },
    {
      name: 'note',
      type: 'text',
      label: { vi: 'Ghi chú / Cam kết', en: 'Note / Commitment' },
      defaultValue:
        'Trung tâm không thu học phí trực tuyến. Học phí được xác nhận và thanh toán tại quầy học vụ sau khi bạn chốt lớp.',
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      label: { vi: 'Chọn Biểu mẫu (Form)', en: 'Select Form' },
      required: true,
    },
    {
      name: 'hotline',
      type: 'text',
      label: { vi: 'Số điện thoại Hotline', en: 'Hotline' },
      defaultValue: '1900 6789',
    },
  ],
}
