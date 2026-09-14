import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CourseRegistrationCTA } from '@/components/public/CourseRegistrationCTA'

vi.mock('@/actions/student/create-enrollment', () => ({
  createEnrollmentAction: vi.fn(),
}))

import { createEnrollmentAction } from '@/actions/student/create-enrollment'

const fetchSpy = vi.spyOn(global, 'fetch')

beforeEach(() => {
  vi.mocked(createEnrollmentAction).mockReset()
  fetchSpy.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('CourseRegistrationCTA', () => {
  it('renders the registration form directly — the gate is the server action, not a client check', () => {
    render(<CourseRegistrationCTA courseId={12} courseTitle="Frontend" />)

    expect(screen.getByRole('button', { name: 'Gửi đăng ký' })).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows the existing enrollment status instead of the registration form', () => {
    render(
      <CourseRegistrationCTA courseId={12} courseTitle="Frontend" enrollmentStatus="CONFIRMED" />,
    )

    expect(screen.getByText('Trạng thái đăng ký')).toBeTruthy()
    expect(screen.getByText('Đã xác nhận')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi đăng ký' })).toBeNull()
  })

  it('switches to the status badge right after a successful registration, no reload needed', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    render(
      <CourseRegistrationCTA
        courseId={12}
        courseTitle="Frontend"
        fullName="Nguyễn Văn A"
        phone="0987654321"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))

    await waitFor(() => expect(screen.getByText('Mới đăng ký')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Gửi đăng ký' })).toBeNull()
  })

  it('passes the student profile fields through to the registration form (specs/009)', () => {
    render(
      <CourseRegistrationCTA
        courseId={12}
        courseTitle="Frontend"
        email="a@b.com"
        fullName="Nguyễn Văn A"
        phone="0987654321"
      />,
    )

    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()
    expect(screen.getByText('0987654321')).toBeTruthy()
    expect(screen.getByText('a@b.com')).toBeTruthy()
  })
})
