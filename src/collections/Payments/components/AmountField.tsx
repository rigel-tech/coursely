'use client'

import { useEffect, useRef, useState } from 'react'
import type { NumberFieldClientComponent } from 'payload'
import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'

import { formatAmountDisplay, parseAmountInput } from '../formatAmount'

/**
 * Same `number` field underneath (value stored/validated as a plain
 * integer) — only the input's own display is grouped with Vietnamese
 * thousands separators. Grouping happens on blur, not on every keystroke:
 * reformatting mid-edit moves the cursor to the end of the input, which
 * breaks correcting a digit anywhere but the very end. `displayValue` tracks
 * the raw typed text while focused, and only re-syncs from `value` (an
 * external change, e.g. the initial load) when the field isn't focused.
 */
export const AmountField: NumberFieldClientComponent = ({
  field,
  path: pathFromProps,
  readOnly: readOnlyFromProps,
}) => {
  const { label, required, admin } = field
  const { path, value, setValue, showError } = useField<number>({
    potentiallyStalePath: pathFromProps,
  })
  const readOnly = Boolean(readOnlyFromProps ?? admin?.readOnly)

  const [displayValue, setDisplayValue] = useState(() => formatAmountDisplay(value))
  const isFocused = useRef(false)

  useEffect(() => {
    if (!isFocused.current) {
      setDisplayValue(formatAmountDisplay(value))
    }
  }, [value])

  return (
    <div className={['field-type', 'number', showError && 'error'].filter(Boolean).join(' ')}>
      <FieldLabel label={label} path={path} required={required} />
      <div className="field-type__wrap">
        <FieldError path={path} showError={showError} />
        <input
          id={`field-${path.replace(/\./g, '__')}`}
          inputMode="numeric"
          type="text"
          readOnly={readOnly}
          value={displayValue}
          onFocus={() => {
            isFocused.current = true
          }}
          onChange={(e) => {
            setDisplayValue(e.target.value)
            setValue(parseAmountInput(e.target.value))
          }}
          onBlur={() => {
            isFocused.current = false
            setDisplayValue(formatAmountDisplay(value))
          }}
        />
      </div>
      <FieldDescription description={admin?.description} path={path} />
    </div>
  )
}
