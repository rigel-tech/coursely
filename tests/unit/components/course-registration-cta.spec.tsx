import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CourseRegistrationCTA } from '@/components/public/CourseRegistrationCTA'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/components/public/forms/CourseRegistrationForm', () => ({
  CourseRegistrationForm: () => <div data-testid="course-registration-form" />,
}))

describe('CourseRegistrationCTA', () => {
  beforeEach(() => {
    push.mockReset()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('redirects unauthenticated visitors to login with the course return path', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 }),
    )

    render(<CourseRegistrationCTA courseId={12} courseSlug="frontend" courseTitle="Frontend" />)
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký khóa học' }))

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/dang-nhap?callbackUrl=%2Fcourses%2Ffrontend'),
    )
  })

  it('shows a toast and the dynamic form for authenticated visitors', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true }), { status: 200 }),
    )

    render(<CourseRegistrationCTA courseId={12} courseSlug="frontend" courseTitle="Frontend" />)
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký khóa học' }))

    expect((await screen.findByRole('status')).textContent).toContain('Bạn đã đăng nhập.')
    expect(await screen.findByTestId('course-registration-form')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })
})
