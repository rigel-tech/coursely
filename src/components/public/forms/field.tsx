import * as React from 'react'

import { Label } from '@/components/public/ui/label'
import { cn } from '@/utilities/ui'

export type FormFieldProps = {
  /** Must match the control's `id`, or the label stops being clickable. */
  htmlFor: string
  label: string
  /** Message from react-hook-form's `formState.errors`. Presence switches the field to invalid. */
  error?: string
  /** Hint shown under the control while there is no error. */
  hint?: string
  children: React.ReactNode
  className?: string
}

/**
 * Label, control and error message as one unit.
 *
 * Exists so the four forms in this folder cannot disagree about invalid-field markup. The
 * error is wired with `role="alert"` and an id the control points at through
 * `aria-describedby` — supply that id as `${htmlFor}-error` on the control, and screen
 * readers announce the message when it appears.
 *
 * @example
 * ```tsx
 * <FormField htmlFor="email" label="Email" error={errors.email?.message}>
 *   <Input
 *     id="email"
 *     aria-describedby={errors.email ? 'email-error' : undefined}
 *     aria-invalid={Boolean(errors.email)}
 *     {...register('email', email())}
 *   />
 * </FormField>
 * ```
 */
export function FormField({ children, className, error, hint, htmlFor, label }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-error-foreground text-xs" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground-subtle text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
