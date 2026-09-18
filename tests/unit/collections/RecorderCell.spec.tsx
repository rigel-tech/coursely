import { cleanup, render, screen } from '@testing-library/react'
import type { DefaultServerCellComponentProps } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RecorderCell } from '@/collections/Payments/components/RecorderCell'

afterEach(cleanup)

const basePayload = (findByID: ReturnType<typeof vi.fn>) =>
  ({
    findByID,
    logger: { error: vi.fn() },
  }) as unknown as DefaultServerCellComponentProps['payload']

const baseProps = {
  collectionSlug: 'payments',
  field: {} as DefaultServerCellComponentProps['field'],
  rowData: {},
} satisfies Omit<
  DefaultServerCellComponentProps,
  'cellData' | 'payload' | 'i18n' | 'collectionConfig'
>

describe('RecorderCell', () => {
  it('shows fullName when the populated User has one', async () => {
    render(
      await RecorderCell({
        ...baseProps,
        cellData: { id: 1, fullName: 'Nguyen Van A', email: 'a@coursely.io' },
        payload: basePayload(vi.fn()),
      } as unknown as DefaultServerCellComponentProps),
    )
    expect(screen.getByText('Nguyen Van A')).toBeTruthy()
  })

  it('falls back to email when the populated User has no fullName', async () => {
    render(
      await RecorderCell({
        ...baseProps,
        cellData: { id: 2, email: 'b@coursely.io' },
        payload: basePayload(vi.fn()),
      } as unknown as DefaultServerCellComponentProps),
    )
    expect(screen.getByText('b@coursely.io')).toBeTruthy()
  })

  it('resolves an unpopulated numeric cellData by fetching the user, and shows its label', async () => {
    const findByID = vi.fn().mockResolvedValue({ id: 3, fullName: 'Le Van C' })
    render(
      await RecorderCell({
        ...baseProps,
        cellData: 3,
        payload: basePayload(findByID),
      } as unknown as DefaultServerCellComponentProps),
    )
    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', id: 3, depth: 0 }),
    )
    expect(screen.getByText('Le Van C')).toBeTruthy()
  })

  it('falls back to the raw id when the fetch fails', async () => {
    const findByID = vi.fn().mockRejectedValue(new Error('not found'))
    render(
      await RecorderCell({
        ...baseProps,
        cellData: 4,
        payload: basePayload(findByID),
      } as unknown as DefaultServerCellComponentProps),
    )
    expect(screen.getByText('#4')).toBeTruthy()
  })

  it('shows an em dash when cellData is undefined', async () => {
    render(
      await RecorderCell({
        ...baseProps,
        cellData: undefined,
        payload: basePayload(vi.fn()),
      } as unknown as DefaultServerCellComponentProps),
    )
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('shows an em dash when cellData is null', async () => {
    render(
      await RecorderCell({
        ...baseProps,
        cellData: null,
        payload: basePayload(vi.fn()),
      } as unknown as DefaultServerCellComponentProps),
    )
    expect(screen.getByText('—')).toBeTruthy()
  })
})
