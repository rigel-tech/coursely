import { describe, it, expect } from 'vitest'

import { generateOtp } from '@/services/otp'

describe('generateOtp', () => {
  it('always returns a 6-character all-digit string and keeps leading zeros', () => {
    let sawLeadingZero = false

    for (let i = 0; i < 3000; i++) {
      const otp = generateOtp()
      expect(otp).toMatch(/^\d{6}$/)
      if (otp.startsWith('0')) sawLeadingZero = true
    }

    // ~10% of a uniform [0, 999999] draw starts with 0 — 3000 iterations make a
    // miss astronomically unlikely, so this pins that padStart is applied.
    expect(sawLeadingZero).toBe(true)
  })
})
