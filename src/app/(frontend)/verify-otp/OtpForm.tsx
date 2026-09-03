'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { verifyOtpAction } from '@/actions/auth/verify-otp'
import { initialVerifyOtpState } from '@/actions/auth/verify-otp.state'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? 'Đang kiểm tra…' : 'Xác minh'}
    </Button>
  )
}

export const OtpForm: React.FC = () => {
  const [state, formAction] = useActionState(verifyOtpAction, initialVerifyOtpState)

  if (state.status === 'success') {
    return (
      <p className="text-sm" role="status">
        Xác minh thành công. Bây giờ bạn có thể đăng nhập.
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp">Mã xác minh</Label>
        <Input
          id="otp"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="––––––"
          className="text-center text-lg tracking-[0.5em]"
        />
      </div>

      {state.status === 'error' && state.message && (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      )}

      <SubmitButton />

      <button
        type="button"
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Gửi lại mã
      </button>
    </form>
  )
}
