import { describe, expect, it } from 'vitest'
import { duplicateRegisterAttemptEmail } from '@/email/templates/duplicate-register-attempt'
import { createEnrollmentCreatedEmailTemplate } from '@/email/templates/enrollment-created'
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

describe('createEnrollmentCreatedEmailTemplate', () => {
  it('includes the course title in the confirmation email', () => {
    const { subject, html, text } = createEnrollmentCreatedEmailTemplate(
      'Giao tiếp cho người đi làm',
    )

    expect(subject.trim()).not.toBe('')
    expect(html).toContain('Giao tiếp cho người đi làm')
    expect(text).toContain('Giao tiếp cho người đi làm')
  })

  it('escapes a course title containing < and & so it cannot break the HTML markup', () => {
    const { html } = createEnrollmentCreatedEmailTemplate('Toán <cao cấp> & Vật lý')

    expect(html).not.toContain('<cao cấp>')
    expect(html).toContain('&lt;cao cấp&gt;')
    expect(html).toContain('&amp;')
  })

  it('leaves the plain-text body with the title exactly as given, unescaped', () => {
    const { text } = createEnrollmentCreatedEmailTemplate('Toán <cao cấp> & Vật lý')

    expect(text).toContain('Toán <cao cấp> & Vật lý')
  })
})

import { createAdminEnrollmentCancelledEmailTemplate } from '@/email/templates/admin-enrollment-cancelled'
import { createAdminEnrollmentCreatedEmailTemplate } from '@/email/templates/admin-enrollment-created'
import { createClassAssignedEmailTemplate } from '@/email/templates/class-assigned'
import { createClassCancelledEmailTemplate } from '@/email/templates/class-cancelled'
import { createClassRescheduledEmailTemplate } from '@/email/templates/class-rescheduled'
import { createEnrollmentConfirmedEmailTemplate } from '@/email/templates/enrollment-confirmed'
import { createPaymentRecordedEmailTemplate } from '@/email/templates/payment-recorded'

describe('createAdminEnrollmentCreatedEmailTemplate', () => {
  it('embeds student identifier and course title', () => {
    const { subject, html, text } = createAdminEnrollmentCreatedEmailTemplate(
      'nguyenvana@gmail.com',
      'React & Next.js',
    )
    expect(subject).toContain('React & Next.js')
    expect(html).toContain('nguyenvana@gmail.com')
    expect(text).toContain('React & Next.js')
  })
})

describe('createAdminEnrollmentCancelledEmailTemplate', () => {
  it('embeds student identifier and course title', () => {
    const { subject, html, text } = createAdminEnrollmentCancelledEmailTemplate(
      'nguyenvana@gmail.com',
      'React & Next.js',
    )
    expect(subject).toContain('React & Next.js')
    expect(html).toContain('nguyenvana@gmail.com')
    expect(text).toContain('React & Next.js')
  })
})

describe('createEnrollmentConfirmedEmailTemplate', () => {
  it('embeds course title and subject', () => {
    const { subject, html, text } = createEnrollmentConfirmedEmailTemplate('React & Next.js')
    expect(subject).toContain('xác nhận')
    expect(html).toContain('React &amp; Next.js')
    expect(text).toContain('React & Next.js')
  })
})

describe('createClassAssignedEmailTemplate', () => {
  it('embeds student, course, class code, and dates', () => {
    const { subject, html, text } = createClassAssignedEmailTemplate({
      studentNameOrEmail: 'Nguyễn Văn A',
      courseTitle: 'React & Next.js',
      classCode: 'REACT-01',
      startDate: '2026-10-01T00:00:00.000Z',
      scheduleTime: 'Tối 2-4-6',
      location: 'Phòng 101',
    })
    expect(subject).toContain('REACT-01')
    expect(html).toContain('Nguyễn Văn A')
    expect(html).toContain('REACT-01')
    expect(html).toContain('Tối 2-4-6')
    expect(text).toContain('Phòng 101')
  })
})

describe('createPaymentRecordedEmailTemplate', () => {
  it('embeds amount, method, and course title', () => {
    const { subject, html, text } = createPaymentRecordedEmailTemplate({
      studentNameOrEmail: 'Học viên B',
      courseTitle: 'Node.js Backend',
      amount: 2500000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNote: 'REF123456',
    })
    expect(subject).toContain('Node.js Backend')
    expect(html).toContain('2.500.000 VND')
    expect(html).toContain('Chuyển khoản ngân hàng')
    expect(text).toContain('REF123456')
  })
})

describe('createClassCancelledEmailTemplate', () => {
  it('embeds student, class code, and course title', () => {
    const { subject, html, text } = createClassCancelledEmailTemplate({
      studentNameOrEmail: 'Nguyễn Văn C',
      courseTitle: 'Python Data Science',
      classCode: 'PY-02',
    })
    expect(subject).toContain('PY-02')
    expect(html).toContain('Nguyễn Văn C')
    expect(html).toContain('PY-02')
    expect(text).toContain('Python Data Science')
  })
})

describe('createClassRescheduledEmailTemplate', () => {
  it('embeds updated schedule details', () => {
    const { subject, html, text } = createClassRescheduledEmailTemplate({
      studentNameOrEmail: 'Nguyễn Văn D',
      courseTitle: 'Python Data Science',
      classCode: 'PY-02',
      startDate: '2026-11-01T00:00:00.000Z',
      scheduleTime: 'Tối 3-5-7',
      location: 'Phòng 202',
    })
    expect(subject).toContain('PY-02')
    expect(html).toContain('Tối 3-5-7')
    expect(html).toContain('Phòng 202')
    expect(text).toContain('PY-02')
  })
})
