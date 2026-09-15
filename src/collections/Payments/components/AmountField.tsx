'use client'

import type { NumberFieldClientComponent } from 'payload'
import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'

import { formatAmountDisplay, parseAmountInput } from '../formatAmount'

/**
 * Same `number` field underneath (value stored/validated as a plain
 * integer) — only the input's own display is grouped with Vietnamese
 * thousands separators as staff type (`1000000` → `1.000.000`). The
 * formatted string is derived straight from `value` every render, so typing
 * a digit round-trips through `setValue` and back with no local state to
 * keep in sync.
 */
export const AmountField: NumberFieldClientComponent = ({ field, path: pathFromProps }) => {
  const { label, required, admin } = field
  const { path, value, setValue, showError } = useField<number>({
    potentiallyStalePath: pathFromProps,
  })

  return (
    <div className={['field-type', 'number', showError && 'error'].filter(Boolean).join(' ')}>
      <FieldLabel label={label} path={path} required={required} />
      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} />
        <input
          id={`field-${path.replace(/\./g, '__')}`}
          inputMode="numeric"
          type="text"
          value={formatAmountDisplay(value)}
          onChange={(e) => setValue(parseAmountInput(e.target.value))}
        />
      </div>
      <FieldDescription description={admin?.description} path={path} />
    </div>
  )
}
