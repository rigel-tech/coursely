import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CourseRegistrationForm } from '@/components/public/forms/CourseRegistrationForm'

vi.mock('@/actions/student/create-enrollment', () => ({
  createEnrollmentAction: vi.fn(),
}))

import { createEnrollmentAction } from '@/actions/student/create-enrollment'

const assign = vi.fn()
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))

beforeEach(() => {
  vi.mocked(createEnrollmentAction).mockReset()
  assign.mockReset()
  // jsdom's window.location.assign is non-configurable, so shadow the whole object.
  vi.stubGlobal('location', { assign, href: 'http://localhost/' })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CourseRegistrationForm', () => {
  it('reads the dynamic course data through react-hook-form submission', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" />)

    submit()

    await waitFor(() => expect(createEnrollmentAction).toHaveBeenCalledWith(12))
  })

  it('hard-navigates to redirectTo when the server sends one', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'error',
      message: 'Vui lòng đăng nhập để đăng ký khóa học.',
      redirectTo: '/dang-nhap?callbackUrl=%2Fkhoa-hoc%2Ffrontend',
    })
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" />)

    submit()

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('/dang-nhap?callbackUrl=%2Fkhoa-hoc%2Ffrontend'),
    )
  })

  it('calls onSuccess and shows the message when the registration succeeds', async () => {
    const onSuccess = vi.fn()
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" onSuccess={onSuccess} />)

    submit()

    expect(await screen.findByText('Đăng ký khóa học thành công.')).toBeTruthy()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(assign).not.toHaveBeenCalled()
  })

  it('shows the message without calling onSuccess when the registration is refused', async () => {
    const onSuccess = vi.fn()
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'error',
      message: 'Thời hạn đăng ký khóa học này đã kết thúc.',
    })
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" onSuccess={onSuccess} />)

    submit()

    expect(await screen.findByText('Thời hạn đăng ký khóa học này đã kết thúc.')).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })
})
