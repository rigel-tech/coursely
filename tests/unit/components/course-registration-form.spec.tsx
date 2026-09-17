import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CourseRegistrationForm } from '@/components/public/forms/CourseRegistrationForm'

vi.mock('@/actions/student/create-enrollment', () => ({
  createEnrollmentAction: vi.fn(),
}))

import { createEnrollmentAction } from '@/actions/student/create-enrollment'

const assign = vi.fn()
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))

/** A profile already complete — the shape most tests here render with. */
const completeProfile = { fullName: 'Nguyễn Văn A', phone: '0987654321' }

/** The course shape most tests here render with. */
const baseCourse = { id: 12, title: 'Frontend', slug: 'frontend' }

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

describe('CourseRegistrationForm — submits directly, no confirmation step', () => {
  it('calls the action with the course id and the form values on submit', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
      enrollmentId: 31,
    })
    render(<CourseRegistrationForm course={baseCourse} profile={completeProfile} />)

    submit()

    await waitFor(() =>
      expect(createEnrollmentAction).toHaveBeenCalledWith({ courseId: 12, ...completeProfile }),
    )
  })

  it('never renders a confirmation modal', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
      enrollmentId: 31,
    })
    render(<CourseRegistrationForm course={baseCourse} profile={completeProfile} />)

    submit()

    await waitFor(() => expect(createEnrollmentAction).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Xác nhận đăng ký' })).toBeNull()
  })

  it('calls onSuccess and shows the message when the registration succeeds', async () => {
    const onSuccess = vi.fn()
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
      enrollmentId: 31,
    })
    render(
      <CourseRegistrationForm
        course={baseCourse}
        onSuccess={onSuccess}
        profile={completeProfile}
      />,
    )

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
    render(
      <CourseRegistrationForm
        course={baseCourse}
        onSuccess={onSuccess}
        profile={completeProfile}
      />,
    )

    submit()

    expect(await screen.findByText('Thời hạn đăng ký khóa học này đã kết thúc.')).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })
})

describe('CourseRegistrationForm — user info is always editable (item 2)', () => {
  it('renders full name and phone as inputs even when the profile is already complete', () => {
    render(
      <CourseRegistrationForm
        course={baseCourse}
        profile={{ email: 'student@example.com', ...completeProfile }}
      />,
    )

    expect(screen.getByLabelText('Họ và tên')).toHaveProperty('value', 'Nguyễn Văn A')
    expect(screen.getByLabelText('Số điện thoại')).toHaveProperty('value', '0987654321')
    expect(screen.getByText('student@example.com')).toBeTruthy()
  })

  it('submits whatever the student edits the prefilled values to', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
      enrollmentId: 31,
    })
    render(<CourseRegistrationForm course={baseCourse} profile={completeProfile} />)

    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Trần Thị B' } })
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912345678' } })
    submit()

    await waitFor(() =>
      expect(createEnrollmentAction).toHaveBeenCalledWith({
        courseId: 12,
        fullName: 'Trần Thị B',
        phone: '0912345678',
      }),
    )
  })

  it('rejects submission client-side when full name is blank, without calling the action', async () => {
    render(<CourseRegistrationForm course={baseCourse} profile={{ phone: '0987654321' }} />)

    submit()

    expect(await screen.findByText('Vui lòng nhập họ và tên.')).toBeTruthy()
    expect(createEnrollmentAction).not.toHaveBeenCalled()
  })
})

describe('CourseRegistrationForm — no profile at all (signed-out visitor)', () => {
  it('shows a sign-in call to action instead of the profile inputs, and never calls the action', () => {
    render(<CourseRegistrationForm course={baseCourse} />)

    expect(screen.queryByLabelText('Họ và tên')).toBeNull()
    expect(screen.queryByLabelText('Số điện thoại')).toBeNull()
    expect(createEnrollmentAction).not.toHaveBeenCalled()
  })

  it('links straight to sign-in with a callback built from the course slug, not the server', () => {
    render(<CourseRegistrationForm course={baseCourse} />)

    const link = screen.getByRole('link', { name: 'Đăng nhập để đăng ký' })
    expect(new URL(link.getAttribute('href')!, 'http://localhost').search).toBe(
      '?callbackUrl=%2Fkhoa-hoc%2Ffrontend',
    )
  })
})
