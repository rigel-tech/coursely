'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'

export const Error = ({ name }: { name: string }) => {
  const {
    formState: { errors },
  } = useFormContext()
  return (
    <div className="mt-2 text-destructive-foreground text-xs font-medium">
      {(errors[name]?.message as string) || 'Vui lòng điền thông tin này'}
    </div>
  )
}
