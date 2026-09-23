// The course detail page used to hand this component its enrollment status and the profile
// the form prefills from, read on the server. That read is what kept the page on
// `force-dynamic`, so it moved here: the component asks `/next/course-status` itself.
//
// Which means the three-way choice below — badge, form, sign-in prompt — is now client
// logic, and this is the only place it is checked.

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

vi.mock('@/actions/student/cancel-enrollment', () => ({ cancelEnrollmentAction: vi.fn() }))
vi.mock('@/actions/student/create-enrollment', () => ({ createEnrollmentAction: vi.fn() }))

const { CourseRegistration } = await import('@/components/public/CourseRegistration')

const course = { id: 7, title: 'Lập trình web', slug: 'lap-trinh-web' }

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const jsonOnce = (value: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => value })

const mount = () => render(React.createElement(CourseRegistration, { course }))

const skeleton = () => screen.queryByRole('status', { name: /đang tải/i })
const badge = () => screen.queryByText(/trạng thái đăng ký/i)
const signInPrompt = () => screen.queryByRole('link', { name: /đăng nhập để đăng ký/i })
const nameField = () => screen.queryByLabelText(/họ và tên|họ tên/i)

describe('CourseRegistration — while the status is still loading', () => {
  it('shows a skeleton, and neither the form nor the sign-in prompt', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    mount()

    expect(skeleton()).toBeTruthy()
    expect(badge()).toBeNull()
    expect(signInPrompt()).toBeNull()
    expect(nameField()).toBeNull()
  })
})

describe('CourseRegistration — once the status arrives', () => {
  it('asks the status route for this course', async () => {
    jsonOnce({ authenticated: false })
    mount()

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(`/next/course-status?courseId=${course.id}`),
    )
  })

  it('shows the enrollment badge when the student has one', async () => {
    jsonOnce({
      authenticated: true,
      profile: { email: 'a@b.test', fullName: 'Nguyễn Văn A', phone: '0912345678' },
      enrollment: { id: 3, enrollmentStatus: 'NEW', canCancel: true },
    })
    mount()

    await waitFor(() => expect(badge()).toBeTruthy())
    expect(screen.queryByRole('button', { name: /hủy đăng ký/i })).toBeTruthy()
    expect(skeleton()).toBeNull()
  })

  it('hides the cancel control when the enrollment may not be cancelled', async () => {
    jsonOnce({
      authenticated: true,
      profile: { email: 'a@b.test' },
      enrollment: { id: 3, enrollmentStatus: 'CONFIRMED', canCancel: false },
    })
    mount()

    await waitFor(() => expect(badge()).toBeTruthy())
    expect(screen.queryByRole('button', { name: /hủy đăng ký/i })).toBeNull()
  })

  it('shows the registration form for a signed-in student with no enrollment', async () => {
    jsonOnce({
      authenticated: true,
      profile: { email: 'a@b.test', fullName: 'Nguyễn Văn A', phone: '0912345678' },
    })
    mount()

    await waitFor(() => expect(nameField()).toBeTruthy())
    expect(badge()).toBeNull()
    expect(signInPrompt()).toBeNull()
  })

  it('shows the sign-in prompt for an anonymous visitor', async () => {
    jsonOnce({ authenticated: false })
    mount()

    await waitFor(() => expect(signInPrompt()).toBeTruthy())
    expect(nameField()).toBeNull()
    expect(badge()).toBeNull()
  })

  it('falls back to the sign-in prompt when the status route cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    mount()

    // Not a spinner that never resolves: a visitor who cannot be identified is offered the
    // one action that can help, the same way `/next/auth-status` failures are handled.
    await waitFor(() => expect(signInPrompt()).toBeTruthy())
    expect(skeleton()).toBeNull()
  })
})
