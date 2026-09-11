'use client'

import * as React from 'react'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'

import { Alert, AlertDescription } from '@/components/public/ui/alert'
import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { verifyOtpAction } from '@/actions/student/verify-otp'
import { initialVerifyOtpState } from '@/lib/constants/verify-otp-state'
import { resendOtpAction } from '@/actions/student/resend-otp'
import { initialResendOtpState } from '@/lib/constants/resend-otp-state'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? 'Đang kiểm tra…' : 'Xác minh'}
    </Button>
  )
}

function ResendButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="text-muted-foreground text-sm underline-offset-4 hover:underline disabled:opacity-50"
    >
      {pending ? 'Đang gửi…' : 'Gửi lại mã'}
    </button>
  )
}

/** Separate `useActionState` from the verify form — sending a new code and
 * checking one are independent outcomes (see specs/004-login-otp-resend/research.md). */
function ResendOtp() {
  const [state, formAction] = useActionState(resendOtpAction, initialResendOtpState)

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <ResendButton />
      {state.status === 'sent' && (
        <p className="text-muted-foreground text-xs" role="status">
          Đã gửi mã mới, vui lòng kiểm tra email.
        </p>
      )}
      {(state.status === 'cooldown' || state.status === 'error') && state.message && (
        <p className="text-destructive-foreground font-medium text-xs" role="alert">
          {state.message}
        </p>
      )}
    </form>
  )
}

export const OtpForm: React.FC = () => {
  const [state, formAction] = useActionState(verifyOtpAction, initialVerifyOtpState)

  useEffect(() => {
    // Full-document load so the fresh session cookies are read server-side.
    if (state.status === 'success') window.location.assign(state.redirectTo ?? '/')
  }, [state.status, state.redirectTo])

  if (state.status === 'success') {
    return (
      <p className="text-sm" role="status">
        Xác minh thành công. Đang chuyển hướng…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
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
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <SubmitButton />
      </form>

      <ResendOtp />
    </div>
  )
}
