import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({
  FieldDescription: () => null,
  FieldLabel: () => null,
  useAuth: vi.fn(),
  useField: vi.fn(),
}))

import { useAuth, useField } from '@payloadcms/ui'

import { CreatedByField } from '@/collections/Enrollments/components/CreatedByField'

afterEach(cleanup)

const baseField = {
  name: 'createdBy',
  relationTo: 'users',
  type: 'relationship',
  label: { vi: 'Admin tạo đơn', en: 'Created By' },
} as any

describe('CreatedByField', () => {
  it('shows the signed-in admin’s own email before the first save, when no value is set yet', () => {
    vi.mocked(useField).mockReturnValue({ path: 'createdBy', value: undefined } as ReturnType<
      typeof useField
    >)
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'admin@coursely.io' },
    } as unknown as ReturnType<typeof useAuth>)

    render(<CreatedByField field={baseField} path="createdBy" />)

    expect(screen.getByDisplayValue('admin@coursely.io')).toBeTruthy()
  })

  it('shows the actual stored creator once the enrollment has been saved', () => {
    vi.mocked(useField).mockReturnValue({
      path: 'createdBy',
      value: { id: 5, email: 'staff@coursely.io' },
    } as unknown as ReturnType<typeof useField>)
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'someone-else@coursely.io' },
    } as unknown as ReturnType<typeof useAuth>)

    render(<CreatedByField field={baseField} path="createdBy" />)

    expect(screen.getByDisplayValue('staff@coursely.io')).toBeTruthy()
  })

  it('renders the input as read-only and disabled', () => {
    vi.mocked(useField).mockReturnValue({ path: 'createdBy', value: undefined } as ReturnType<
      typeof useField
    >)
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'admin@coursely.io' },
    } as unknown as ReturnType<typeof useAuth>)

    render(<CreatedByField field={baseField} path="createdBy" />)

    const input = screen.getByDisplayValue('admin@coursely.io') as HTMLInputElement
    expect(input.readOnly).toBe(true)
    expect(input.disabled).toBe(true)
  })
})
