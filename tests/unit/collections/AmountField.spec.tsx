import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({
  FieldDescription: () => null,
  FieldError: () => null,
  FieldLabel: () => null,
  useField: vi.fn(),
}))

import { useField } from '@payloadcms/ui'

import { AmountField } from '@/collections/Payments/components/AmountField'

afterEach(cleanup)

const baseField = { label: { vi: 'Số tiền', en: 'Amount' } } as unknown as ComponentProps<
  typeof AmountField
>['field']

const mockField = (value: number | null | undefined) => {
  vi.mocked(useField).mockReturnValue({
    path: 'amount',
    value,
    setValue: vi.fn(),
    showError: false,
  } as unknown as ReturnType<typeof useField>)
}

describe('AmountField', () => {
  it('respects a readOnly prop passed in by Payload (a locked document, or no update permission)', () => {
    mockField(1000000)
    render(<AmountField field={baseField} path="amount" readOnly={true} />)

    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.readOnly).toBe(true)
  })

  it('is editable when readOnly is not set', () => {
    mockField(1000000)
    render(<AmountField field={baseField} path="amount" />)

    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.readOnly).toBe(false)
  })

  it('does not reformat the display value while typing — only the raw keystrokes show', () => {
    mockField(1500000)
    render(<AmountField field={baseField} path="amount" />)

    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: '15000005' } })

    expect(input.value).toBe('15000005')
  })

  it('reformats with thousands separators once the field loses focus', () => {
    mockField(1500000)
    render(<AmountField field={baseField} path="amount" />)

    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: '15000005' } })
    fireEvent.blur(input)

    expect(input.value).toBe('1.500.000')
  })
})
