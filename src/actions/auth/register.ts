'use server'

import { cookies, headers } from 'next/headers'

import { PENDING_EMAIL_COOKIE, PENDING_EMAIL_TTL_SEC } from '@/lib/constants/auth'
import { parseRegisterInput } from '@/lib/validation/register-schema'
import { registerStudent } from '@/services/register'
import type { RegisterState } from '@/lib/constants/register-state'

/**
 * Server action for self-registration (§5.1). Orchestration only: read request
 * context, validate the form, delegate to `registerStudent`, then translate the
 * result into a `pending_email` cookie + `{ status: 'success' }`, or an `AUTH_00x`
 * error for the form to render. The redirect to `/verify-otp` is the client's job
 * (`<RegisterForm>`): redirecting from here races the `Set-Cookie`, so the target
 * page can load before the cookie exists and bounce straight back.
 */
export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  const userAgent = h.get('user-agent') || 'unknown'

  const parsed = parseRegisterInput({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    terms: formData.get('terms'),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      code: 'AUTH_001',
      message: 'Dữ liệu không hợp lệ.',
      fieldErrors: parsed.fieldErrors,
    }
  }

  let email: string
  try {
    const result = await registerStudent(parsed.data, { ip, userAgent })
    if (!result.ok) {
      return {
        status: 'error',
        code: 'AUTH_002',
        message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.',
      }
    }
    email = result.email
  } catch (err) {
    console.error('registerAction failed', err)
    return { status: 'error', code: 'AUTH_003', message: 'Có lỗi hệ thống. Vui lòng thử lại sau.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_EMAIL_TTL_SEC,
    secure: process.env.NODE_ENV === 'production',
  })

  return { status: 'success' }
}
