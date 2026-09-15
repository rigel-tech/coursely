import { describe, expect, it } from 'vitest'
import { duplicateRegisterAttemptEmail } from '@/email/templates/duplicate-register-attempt'
import { enrollmentCreatedEmail } from '@/email/templates/enrollment-created'
import { resetPasswordEmail } from '@/email/templates/reset-password'
import { verifyOtpEmail } from '@/email/templates/verify-otp'
import { getServerSideURL } from '@/utilities/getURL'

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

describe('resetPasswordEmail', () => {
  it('embeds the reset link and carries a subject', () => {
    const link = `${getServerSideURL()}/dat-lai-mat-khau?token=test-token-xyz`
    const { subject, html, text } = resetPasswordEmail(link)

    expect(subject.trim()).not.toBe('')
    expect(html).toContain(link)
    expect(text).toContain(link)
  })
})

describe('enrollmentCreatedEmail', () => {
  it('includes the course title in the confirmation email', () => {
    const { subject, html, text } = enrollmentCreatedEmail('Giao tiếp cho người đi làm')

    expect(subject.trim()).not.toBe('')
    expect(html).toContain('Giao tiếp cho người đi làm')
    expect(text).toContain('Giao tiếp cho người đi làm')
  })

  it('escapes a course title containing < and & so it cannot break the HTML markup', () => {
    const { html } = enrollmentCreatedEmail('Toán <cao cấp> & Vật lý')

    expect(html).not.toContain('<cao cấp>')
    expect(html).toContain('&lt;cao cấp&gt;')
    expect(html).toContain('&amp;')
  })

  it('leaves the plain-text body with the title exactly as given, unescaped', () => {
    const { text } = enrollmentCreatedEmail('Toán <cao cấp> & Vật lý')

    expect(text).toContain('Toán <cao cấp> & Vật lý')
  })
})
