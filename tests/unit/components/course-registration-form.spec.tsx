import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CourseRegistrationForm } from '@/components/public/forms/CourseRegistrationForm'

describe('CourseRegistrationForm', () => {
  it('reads the dynamic course data through react-hook-form submission', async () => {
    const onSubmit = vi.fn()

    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ courseId: 12, note: '' }))
  })
})
