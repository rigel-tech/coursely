import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PersonalInfoCard } from '@/components/public/profile/PersonalInfoCard'
import type { Student } from '@/payload-types'

vi.mock('@/actions/student/profile', () => ({
  updateProfileAction: vi.fn(),
}))

import { updateProfileAction } from '@/actions/student/profile'

const initialStudent: Student = {
  id: 1,
  email: 'an@example.com',
  fullName: 'An',
  phone: '0901111111',
  status: 'ACTIVE',
  collection: 'students',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

beforeEach(() => {
  vi.mocked(updateProfileAction).mockReset()
})

afterEach(() => {
  cleanup()
})

describe('PersonalInfoCard — reset behavior on edit cancel and save success', () => {
  it('resets to updated user values after save rather than stale mount-time defaultValues', async () => {
    vi.mocked(updateProfileAction).mockResolvedValue({
      status: 'success',
      message: 'Cập nhật thông tin thành công.',
    })

    const onAvatarReset = vi.fn()
    const { rerender } = render(
      <PersonalInfoCard user={initialStudent} avatarFile={null} onAvatarReset={onAvatarReset} />,
    )

    // 1. Click "Chỉnh sửa thông tin"
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa thông tin' }))

    // 2. Change name to "Bình" and submit
    const nameInput = screen.getByLabelText(/Họ và tên/) as HTMLInputElement
    expect(nameInput.value).toBe('An')
    fireEvent.change(nameInput, { target: { value: 'Bình' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => {
      expect(updateProfileAction).toHaveBeenCalled()
      expect(onAvatarReset).toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).toBeNull()
    })

    // 3. Parent re-renders with refreshed student doc from server revalidation
    const updatedStudent: Student = {
      ...initialStudent,
      fullName: 'Bình',
    }
    rerender(
      <PersonalInfoCard user={updatedStudent} avatarFile={null} onAvatarReset={onAvatarReset} />,
    )

    // 4. Open edit mode again, type "Chi", and click "Hủy"
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa thông tin' }))
    const nameInput2 = screen.getByLabelText(/Họ và tên/) as HTMLInputElement
    expect(nameInput2.value).toBe('Bình')

    fireEvent.change(nameInput2, { target: { value: 'Chi' } })
    expect(nameInput2.value).toBe('Chi')

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(onAvatarReset).toHaveBeenCalledTimes(2)

    // 5. Open edit mode a third time: name must still be "Bình", not the stale "An"
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa thông tin' }))
    const nameInput3 = screen.getByLabelText(/Họ và tên/) as HTMLInputElement
    expect(nameInput3.value).toBe('Bình')
  })

  it('calls onAvatarReset on successful submission with avatarFile', async () => {
    vi.mocked(updateProfileAction).mockResolvedValue({
      status: 'success',
      message: 'Cập nhật thành công.',
    })

    const onAvatarReset = vi.fn()
    const mockFile = new File(['avatar-bytes'], 'photo.jpg', { type: 'image/jpeg' })

    render(
      <PersonalInfoCard
        user={initialStudent}
        avatarFile={mockFile}
        onAvatarReset={onAvatarReset}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa thông tin' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => {
      expect(updateProfileAction).toHaveBeenCalled()
      expect(onAvatarReset).toHaveBeenCalled()
    })
  })
})
