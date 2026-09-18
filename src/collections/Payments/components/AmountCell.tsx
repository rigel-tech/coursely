'use client'

import type { DefaultCellComponentProps } from 'payload'

import { formatAmountDisplay } from '../formatAmount'

/**
 * The list view always reads at `depth: 0`, so `cellData` here is the raw
 * number — same grouping as `AmountField`'s input, just not editable.
 */
export const AmountCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  if (typeof cellData !== 'number') return <span>—</span>

  return <span>{formatAmountDisplay(cellData)}</span>
}
