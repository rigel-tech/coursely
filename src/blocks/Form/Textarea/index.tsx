import type { TextField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import { Label } from '@/components/public/ui/label'
import { Textarea as TextAreaComponent } from '@/components/public/ui/textarea'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'

export const Textarea: React.FC<
  TextField & {
    errors: Partial<FieldErrorsImpl>
    register: UseFormRegister<FieldValues>
    rows?: number
  }
> = ({ name, defaultValue, errors, label, register, required, rows = 3, width }) => {
  return (
    <Width width={width}>
      <Label className="mb-1.5 inline-block text-sm font-medium" htmlFor={name}>
        {label}
        {required && <span className="text-destructive-foreground ml-0.5">*</span>}
      </Label>

      <TextAreaComponent
        id={name}
        placeholder={defaultValue || undefined}
        rows={rows}
        {...register(name, { required: required })}
      />

      {errors[name] && <Error name={name} />}
    </Width>
  )
}
