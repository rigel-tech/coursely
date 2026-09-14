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
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" {...completeProfile} />)

    submit()

    await waitFor(() =>
      expect(createEnrollmentAction).toHaveBeenCalledWith({ courseId: 12, ...completeProfile }),
    )
  })

  it('hard-navigates to redirectTo when the server sends one', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'error',
      message: 'Vui lòng đăng nhập để đăng ký khóa học.',
      redirectTo: '/dang-nhap?callbackUrl=%2Fkhoa-hoc%2Ffrontend',
    })
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" {...completeProfile} />)

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
    render(
      <CourseRegistrationForm
        courseId={12}
        courseTitle="Frontend"
        onSuccess={onSuccess}
        {...completeProfile}
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
        courseId={12}
        courseTitle="Frontend"
        onSuccess={onSuccess}
        {...completeProfile}
      />,
    )

    submit()

    expect(await screen.findByText('Thời hạn đăng ký khóa học này đã kết thúc.')).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })
})

describe('CourseRegistrationForm — reviewing an already-complete profile (specs/009)', () => {
  it('shows full name, phone and email as plain text — none of them an input', () => {
    render(
      <CourseRegistrationForm
        courseId={12}
        courseTitle="Frontend"
        email="student@example.com"
        {...completeProfile}
      />,
    )

    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()
    expect(screen.getByText('0987654321')).toBeTruthy()
    expect(screen.getByText('student@example.com')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('still submits the complete values via hidden fields', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" {...completeProfile} />)

    submit()

    await waitFor(() =>
      expect(createEnrollmentAction).toHaveBeenCalledWith({ courseId: 12, ...completeProfile }),
    )
  })
})

describe('CourseRegistrationForm — a field that is missing or invalid becomes editable (specs/009)', () => {
  it('shows an input for a blank full name while phone stays plain text', () => {
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" phone="0987654321" />)

    expect(screen.getByLabelText('Họ và tên')).toBeTruthy()
    expect(screen.getByText('0987654321')).toBeTruthy()
  })

  it('shows an input for an invalidly-formatted phone even though it is not blank', () => {
    render(
      <CourseRegistrationForm
        courseId={12}
        courseTitle="Frontend"
        fullName="Nguyễn Văn A"
        phone="123456"
      />,
    )

    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()
    expect(screen.getByLabelText('Số điện thoại')).toBeTruthy()
  })

  it('rejects submission client-side when full name is blank, without calling the action', async () => {
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" phone="0987654321" />)

    submit()

    expect(await screen.findByText('Vui lòng nhập họ và tên.')).toBeTruthy()
    expect(createEnrollmentAction).not.toHaveBeenCalled()
  })

  it('sends the values the student just typed into the missing fields', async () => {
    vi.mocked(createEnrollmentAction).mockResolvedValue({
      status: 'success',
      message: 'Đăng ký khóa học thành công.',
    })
    render(<CourseRegistrationForm courseId={12} courseTitle="Frontend" />)

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
})
