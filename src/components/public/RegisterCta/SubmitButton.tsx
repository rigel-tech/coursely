'use client'

import * as React from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/public/ui/button'

/**
 * Submit control for the registration form. Reads `useFormStatus` so it must be
 * rendered inside the `<form>` it submits — it disables and relabels itself while
 * the action is in flight.
 */
export const SubmitButton: React.FC = () => {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? 'Đang xử lý…' : 'Tạo tài khoản'}
    </Button>
  )
}
