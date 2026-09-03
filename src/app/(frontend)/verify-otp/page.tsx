import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'

import { maskEmail } from '@/lib/mask-email'
import { OtpForm } from './OtpForm'

/**
 * Server Component. Reads the `pending_email` cookie set by `registerAction`;
 * without it there is nothing to verify, so bounce home. With it, show the masked
 * address and the code form.
 */
export default async function VerifyOtpPage() {
  const pendingEmail = (await cookies()).get('pending_email')?.value
  if (!pendingEmail) redirect('/')

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
