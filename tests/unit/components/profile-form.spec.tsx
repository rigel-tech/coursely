import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProfileForm } from '@/components/public/forms/ProfileForm'
import type { Student } from '@/payload-types'
import type { StudentEnrollmentItem } from '@/services/student-enrollment'

vi.mock('@/actions/student/profile', () => ({
  updateProfileAction: vi.fn(),
}))

vi.mock('@/components/public/LogoutCta', () => ({
  LogoutCta: () => <button type="button">Đăng xuất</button>,
}))

const mockStudent: Student = {
  id: 1,
  email: 'student@example.com',
  fullName: 'Nguyễn Văn Học Viên',
  phone: '0901234567',
  status: 'ACTIVE',
  collection: 'students',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

const baseCourse = {
  id: 101,
  title: 'Khóa học React & Next.js Chuyên Sâu',
  slug: 'khoa-hoc-react-nextjs',
  duration: '8 tuần',
}

afterEach(() => {
  cleanup()
})

describe('ProfileForm — Assigned and Unassigned Class Rendering', () => {
  it('renders assigned class code, dates, schedule time, location, and badge', () => {
    const enrollmentWithClass: StudentEnrollmentItem = {
      id: 1,
      course: baseCourse,
      class: {
        code: 'REACT-K26-01',
        startDate: '2026-09-30T17:00:00.000Z', // 01/10/2026 in Asia/Ho_Chi_Minh
        endDate: '2026-11-29T17:00:00.000Z', // 30/11/2026 in Asia/Ho_Chi_Minh
        scheduleTime: 'Tối 2-4-6 (19:00 - 21:00)',
        location: 'Phòng 402, Tòa nhà TechHub',
      },
      enrollmentStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      registeredAt: '2026-09-10T08:00:00.000Z',
      createdAt: '2026-09-10T08:00:00.000Z',
    }

    render(<ProfileForm user={mockStudent} enrollments={[enrollmentWithClass]} />)

    // Asserts class code and badge
    expect(screen.getByText('REACT-K26-01')).toBeDefined()
    expect(screen.getByText('Đã xếp lớp')).toBeDefined()

    // Asserts timezone-aware date formatting (Asia/Ho_Chi_Minh UTC+7)
    expect(screen.getByText(/01\/10\/2026 – 30\/11\/2026/)).toBeDefined()

    // Asserts schedule time and location
    expect(screen.getByText('Tối 2-4-6 (19:00 - 21:00)')).toBeDefined()
    expect(screen.getByText('Phòng 402, Tòa nhà TechHub')).toBeDefined()
  })

  it('renders unassigned class state ("Chưa xếp lớp") when class is null for active enrollment', () => {
    const unassignedEnrollment: StudentEnrollmentItem = {
      id: 2,
      course: baseCourse,
      class: null,
      enrollmentStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      registeredAt: '2026-09-10T08:00:00.000Z',
      createdAt: '2026-09-10T08:00:00.000Z',
    }

    render(<ProfileForm user={mockStudent} enrollments={[unassignedEnrollment]} />)

    expect(screen.getByText('Chưa xếp lớp')).toBeDefined()
    expect(screen.getByText('Coursely sẽ thông báo khi có lịch xếp lớp')).toBeDefined()
    expect(screen.queryByText('Đã xếp lớp')).toBeNull()
  })

  it('suppresses unassigned class promise when enrollment is CANCELLED', () => {
    const cancelledEnrollment: StudentEnrollmentItem = {
      id: 3,
      course: baseCourse,
      class: null,
      enrollmentStatus: 'CANCELLED',
      paymentStatus: 'CANCELLED',
      registeredAt: '2026-09-10T08:00:00.000Z',
      createdAt: '2026-09-10T08:00:00.000Z',
    }

    render(<ProfileForm user={mockStudent} enrollments={[cancelledEnrollment]} />)

    expect(screen.getByText('Đã hủy / Hoàn tiền')).toBeDefined()
    expect(screen.queryByText('Chưa xếp lớp')).toBeNull()
    expect(screen.queryByText('Coursely sẽ thông báo khi có lịch xếp lớp')).toBeNull()
  })

  it('renders class without endDate, scheduleTime, or location gracefully', () => {
    const minimalClassEnrollment: StudentEnrollmentItem = {
      id: 5,
      course: baseCourse,
      class: {
        code: 'MINIMAL-01',
        startDate: '2026-10-01T00:00:00.000Z',
      },
      enrollmentStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      registeredAt: '2026-09-10T08:00:00.000Z',
      createdAt: '2026-09-10T08:00:00.000Z',
    }

    render(<ProfileForm user={mockStudent} enrollments={[minimalClassEnrollment]} />)

    expect(screen.getByText('MINIMAL-01')).toBeDefined()
    expect(screen.getByText('Đã xếp lớp')).toBeDefined()
    expect(screen.getByText(/01\/10\/2026/)).toBeDefined()
    expect(screen.queryByText('Khung giờ:')).toBeNull()
    expect(screen.queryByText('Địa điểm:')).toBeNull()
  })
})
