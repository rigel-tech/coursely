'use client'

import type { RelationshipFieldClientComponent } from 'payload'
import { FieldDescription, FieldLabel, useAuth, useField } from '@payloadcms/ui'

/**
 * `createdBy` is set server-side on create (`setCreatedBy`) and never editable — before the
 * first save it holds nothing yet, so this shows the signed-in admin's own email as a
 * preview of what will be saved. Once saved, `value` is the real stored user.
 */
export const CreatedByField: RelationshipFieldClientComponent = ({
  field,
  path: pathFromProps,
}) => {
  const { label, admin } = field
  const { path, value } = useField<number | { email?: string; id: number }>({
    potentiallyStalePath: pathFromProps,
  })
  const { user } = useAuth()

  const displayValue =
    value && typeof value === 'object'
      ? (value.email ?? String(value.id))
      : typeof value === 'number'
        ? String(value)
        : (user?.email ?? '')

  return (
    <div className="field-type relationship">
      <FieldLabel label={label} path={path} />
      <div className="field-type__wrap">
        <input
          id={`field-${path.replace(/\./g, '__')}`}
          type="text"
          value={displayValue}
          readOnly
          disabled
        />
      </div>
      <FieldDescription description={admin?.description} path={path} />
    </div>
  )
}
