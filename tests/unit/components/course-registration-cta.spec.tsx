import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CourseRegistrationCTA } from '@/components/public/CourseRegistrationCTA'

vi.mock('@/actions/student/create-enrollment', () => ({
  createEnrollmentAction: vi.fn(),
}))

import { createEnrollmentAction } from '@/actions/student/create-enrollment'

const fetchSpy = vi.spyOn(global, 'fetch')
const baseCourse = { id: 12, title: 'Frontend', slug: 'frontend' }

beforeEach(() => {
  vi.mocked(createEnrollmentAction).mockReset()
  fetchSpy.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('CourseRegistrationCTA', () => {
  it('renders the registration form directly for a signed-in profile, with no client fetch', () => {
    render(
      <CourseRegistrationCTA
        course={baseCourse}
        profile={{ fullName: 'Nguyễn Văn A', phone: '0987654321' }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Gửi đăng ký' })).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows the sign-in call to action, not the registration form, with no profile at all', () => {
    render(<CourseRegistrationCTA course={baseCourse} />)

    expect(screen.getByRole('link', { name: 'Đăng nhập để đăng ký' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi đăng ký' })).toBeNull()
  })

  it('shows the existing enrollment status instead of the registration form', () => {
    render(<CourseRegistrationCTA course={baseCourse} enrollmentStatus="CONFIRMED" />)

    expect(screen.getByText('Trạng thái đăng ký')).toBeTruthy()
    expect(screen.getByText('Đã xác nhận')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi đăng ký' })).toBeNull()
  })

  it('gives CANCELLED a different badge colour than CONFIRMED — statuses are not lumped together', () => {
    const { unmount } = render(
      <CourseRegistrationCTA course={baseCourse} enrollmentStatus="CONFIRMED" />,
    )
    const confirmedClass = screen.getByText('Đã xác nhận').className
    unmount()

    render(<CourseRegistrationCTA course={baseCourse} enrollmentStatus="CANCELLED" />)
    const cancelledClass = screen.getByText('Đã hủy').className

    expect(cancelledClass).not.toBe(confirmedClass)
  })

  it('switches to the status badge right after a successful registration, no reload needed', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    render(
      <CourseRegistrationCTA
        course={baseCourse}
        profile={{ fullName: 'Nguyễn Văn A', phone: '0987654321' }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))

    await waitFor(() => expect(screen.getByText('Mới đăng ký')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Gửi đăng ký' })).toBeNull()
  })

  it('passes the student profile fields through to the registration form as prefilled inputs (specs/009)', () => {
    render(
      <CourseRegistrationCTA
        course={baseCourse}
        profile={{ email: 'a@b.com', fullName: 'Nguyễn Văn A', phone: '0987654321' }}
      />,
    )

    expect(screen.getByLabelText('Họ và tên')).toHaveProperty('value', 'Nguyễn Văn A')
    expect(screen.getByLabelText('Số điện thoại')).toHaveProperty('value', '0987654321')
    expect(screen.getByText('a@b.com')).toBeTruthy()
  })
})
