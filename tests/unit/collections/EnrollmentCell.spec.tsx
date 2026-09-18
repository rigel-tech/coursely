import { cleanup, render, screen } from '@testing-library/react'
import type { DefaultCellComponentProps } from 'payload'
import { afterEach, describe, expect, it } from 'vitest'

import { EnrollmentCell } from '@/collections/Payments/components/EnrollmentCell'

afterEach(cleanup)

const baseProps = {
  collectionSlug: 'payments',
  field: {} as DefaultCellComponentProps['field'],
  rowData: {},
} satisfies Omit<DefaultCellComponentProps, 'cellData'>

describe('EnrollmentCell', () => {
  it('shows the id when cellData is a populated Enrollment', () => {
    render(<EnrollmentCell {...baseProps} cellData={{ id: 3, student: 1, course: 1 }} />)
    expect(screen.getByText('#3')).toBeTruthy()
  })

  it('shows the raw id when cellData is an unpopulated number', () => {
    render(<EnrollmentCell {...baseProps} cellData={5} />)
    expect(screen.getByText('#5')).toBeTruthy()
  })

  it('shows an em dash when cellData is undefined', () => {
    render(<EnrollmentCell {...baseProps} cellData={undefined} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('shows an em dash when cellData is null', () => {
    render(<EnrollmentCell {...baseProps} cellData={null} />)
    expect(screen.getByText('—')).toBeTruthy()
  })
})
