// Test-side view of the OTP challenge. The specs that used to poke `otp:verify:{email}`
// in Redis read and clean it through here, so the record's shape is written down in one
// place rather than copied into four specs.

import type { Payload } from 'payload'

export type OtpRecord = { hash: string; attempts: number; expiresAt: number; nextResendAt: number }

export const otpKey = (email: string) => `otp:${email}`

export const readOtp = (payload: Payload, email: string) => payload.kv.get<OtpRecord>(otpKey(email))

export const clearOtp = (payload: Payload, email: string) => payload.kv.delete(otpKey(email))
