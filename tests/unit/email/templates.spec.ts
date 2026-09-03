import { describe, it, expect } from 'vitest'

import { verifyOtpEmail } from '@/email/templates/verify-otp'
import { duplicateRegisterAttemptEmail } from '@/email/templates/duplicate-register-attempt'

describe('verifyOtpEmail', () => {
  it('embeds the exact code and carries a subject', () => {
    const { subject, html, text } = verifyOtpEmail('004217')

    expect(subject.trim()).not.toBe('')
    expect(html).toContain('004217')
    expect(text).toContain('004217')
  })
})

describe('duplicateRegisterAttemptEmail', () => {
  it('renders a subject and body', () => {
    const { subject, html } = duplicateRegisterAttemptEmail()

    expect(subject.trim()).not.toBe('')
    expect(html.length).toBeGreaterThan(20)
  })
})
