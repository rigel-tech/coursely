import { cleanup, render, screen } from '@testing-library/react'
import type { DefaultCellComponentProps } from 'payload'
import { afterEach, describe, expect, it } from 'vitest'

import { AmountCell } from '@/collections/Payments/components/AmountCell'

afterEach(cleanup)

const baseProps = {
  collectionSlug: 'payments',
  field: {} as DefaultCellComponentProps['field'],
  rowData: {},
} satisfies Omit<DefaultCellComponentProps, 'cellData'>

describe('AmountCell', () => {
  it('groups the amount with Vietnamese thousands separators', () => {
    render(<AmountCell {...baseProps} cellData={2000333} />)
    expect(screen.getByText('2.000.333')).toBeTruthy()
  })

  it('shows an em dash when cellData is not a number', () => {
    render(<AmountCell {...baseProps} cellData={undefined} />)
    expect(screen.getByText('—')).toBeTruthy()
  })
})
