import type { EmailField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import React from 'react'

import { Error } from '../Error'
import { Width } from '../Width'

export const Email: React.FC<
  EmailField & {
    errors: Partial<FieldErrorsImpl>
    register: UseFormRegister<FieldValues>
  }
> = ({ name, defaultValue, errors, label, register, required, width }) => {
  return (
    <Width width={width}>
      <Label className="mb-1.5 inline-block text-sm font-medium" htmlFor={name}>
        {label}
        {required && <span className="text-destructive-foreground ml-0.5">*</span>}
      </Label>
      <Input
        id={name}
        placeholder={defaultValue || undefined}
        type="email"
        {...register(name, { pattern: /^\S[^\s@]*@\S+$/, required })}
      />

      {errors[name] && <Error name={name} />}
    </Width>
  )
}
