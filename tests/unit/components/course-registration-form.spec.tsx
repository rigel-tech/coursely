import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CourseRegistrationForm } from '@/components/public/forms/CourseRegistrationForm'

vi.mock('@/actions/student/create-enrollment', () => ({
  createEnrollmentAction: vi.fn().mockResolvedValue({
    status: 'success',
    message: 'Đăng ký khóa học thành công.',
  }),
}))

import { createEnrollmentAction } from '@/actions/student/create-enrollment'

describe('CourseRegistrationForm', () => {
  it('reads the dynamic course data through react-hook-form submission', async () => {
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" />)

    fireEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))

    await waitFor(() => expect(createEnrollmentAction).toHaveBeenCalledWith(12))
  })
})
