/**
 * Zod schema for "forgot password". `emailSchema` is the whole rule — `forgotPasswordAction`
 * takes the address directly and validates it with this, no wrapper object: there is only
 * one field, so there is nothing to bundle. `forgotPasswordSchema` wraps it in an object
 * only because `react-hook-form`'s `register('email')` needs a field name to bind to;
 * `<ForgotPasswordForm>` is the one caller that needs that shape.
 */
import { z } from 'zod'

export const emailSchema = z
  .email('Email không đúng định dạng')
  .trim()
  .min(1, 'Email không được để trống')

export const forgotPasswordSchema = z.object({ email: emailSchema })

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
