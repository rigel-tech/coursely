import { cleanup, render, screen } from '@testing-library/react'
import type { DefaultCellComponentProps } from 'payload'
import { afterEach, describe, expect, it } from 'vitest'

import { RecorderCell } from '@/collections/Payments/components/RecorderCell'

afterEach(cleanup)

// Only `cellData` varies per test — the rest of `DefaultCellComponentProps` is irrelevant to
// RecorderCell's own branching, so it's stubbed once and spread in.
const baseProps = {
  collectionSlug: 'payments',
  field: {} as DefaultCellComponentProps['field'],
  rowData: {},
} satisfies Omit<DefaultCellComponentProps, 'cellData'>

describe('RecorderCell', () => {
  it('shows fullName when the populated User has one', () => {
    render(
      <RecorderCell
        {...baseProps}
        cellData={{ id: 1, fullName: 'Nguyen Van A', email: 'a@coursely.io' }}
      />,
    )
    expect(screen.getByText('Nguyen Van A')).toBeTruthy()
  })

  it('falls back to email when the populated User has no fullName', () => {
    render(<RecorderCell {...baseProps} cellData={{ id: 2, email: 'b@coursely.io' }} />)
    expect(screen.getByText('b@coursely.io')).toBeTruthy()
  })

  it('shows the raw id when cellData is an unpopulated number', () => {
    render(<RecorderCell {...baseProps} cellData={3} />)
    expect(screen.getByText('#3')).toBeTruthy()
  })

  it('shows an em dash when cellData is undefined', () => {
    render(<RecorderCell {...baseProps} cellData={undefined} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('shows an em dash when cellData is null', () => {
    render(<RecorderCell {...baseProps} cellData={null} />)
    expect(screen.getByText('—')).toBeTruthy()
  })
})
