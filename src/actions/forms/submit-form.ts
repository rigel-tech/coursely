'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

export type SubmitFormInput = {
  formID: number
  formData: Record<string, unknown>
}

export type SubmitFormResult = {
  success: boolean
  message: string
}

export async function submitFormAction(input: SubmitFormInput): Promise<SubmitFormResult> {
  const formId = input.formID
  if (!formId) {
    return { success: false, message: 'ID biểu mẫu không hợp lệ.' }
  }

  if (!input.formData || Object.keys(input.formData).length === 0) {
    return { success: false, message: 'Dữ liệu gửi lên không được để trống.' }
  }

  const submissionData = Object.entries(input.formData).map(([name, value]) => ({
    field: name,
    value: String(value ?? '').trim(),
  }))

  try {
    const payload = await getPayload({ config: configPromise })

    await payload.create({
      collection: 'form-submissions',
      data: {
        form: formId,
        submissionData,
      },
    })

    return {
      success: true,
      message: 'Gửi thông tin tư vấn thành công!',
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Đã có lỗi xảy ra, vui lòng thử lại sau.',
    }
  }
}
