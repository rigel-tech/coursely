'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { RegisterForm as RegisterFields } from '@/components/public/forms/register-form'
import { registerAction } from '@/actions/auth/register'
import { initialRegisterState, type RegisterState } from '@/lib/constants/register-state'
import type { RegisterValues } from '@/lib/validation/register-schema'

const SYSTEM_FAILURE: RegisterState = {
  status: 'error',
  message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
}

/**
 * Self-registration (Student). The fields, their validation and their error markup all
 * belong to the shared `<RegisterForm>`; this owns only what that form cannot know — the
 * server action and where to go afterwards.
 *
 * The redirect to `/xac-thuc-otp` runs here, after the action resolves, and not inside the
 * action: the `pending_email` cookie from the action response has to be stored before the
 * target page reads it.
 *
 * The action rethrows anything it has no copy for, so the `.catch` is the last place a
 * system failure can reach the person instead of crashing the page.
 */
export const RegisterForm: React.FC = () => {
  const router = useRouter()
  const [state, setState] = useState<RegisterState>(initialRegisterState)

  const onSubmit = async (values: RegisterValues) => {
    const result = await registerAction(values).catch(() => SYSTEM_FAILURE)

    setState(result)
    if (result.status === 'success') router.push('/xac-thuc-otp')
  }

  return (
    <RegisterFields
      error={state.status === 'error' ? state.message : undefined}
      onSubmit={onSubmit}
    />
  )
}
