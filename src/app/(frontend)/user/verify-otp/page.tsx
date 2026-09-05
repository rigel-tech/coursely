import { cookies } from 'next/headers'
import React from 'react'

import { PENDING_EMAIL_COOKIE } from '@/lib/constants/auth'
import { maskEmail } from '@/lib/mask-email'
import { OtpForm } from './OtpForm'

/**
 * Server Component. `proxy` already guaranteed the `pending_email` cookie is
 * present (it bounces home otherwise); here it is only read to mask the address.
 */
export default async function VerifyOtpPage() {
  const pendingEmail = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value ?? ''

  return (
    <div className="container py-28">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-semibold">Xác minh email</h1>
        <p className="text-muted-foreground mb-6">
          Chúng tôi đã gửi mã gồm 6 chữ số tới <strong>{maskEmail(pendingEmail)}</strong>. Mã có
          hiệu lực trong 5 phút.
        </p>
        <OtpForm />
      </div>
    </div>
  )
}
