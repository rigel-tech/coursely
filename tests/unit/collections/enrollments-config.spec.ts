import { describe, expect, it } from 'vitest'
import type { Field } from 'payload'

import { Enrollments } from '@/collections/Enrollments'
import { authenticated } from '@/access/authenticated'
import configPromise from '@/payload.config'

const field = (name: string) =>
  Enrollments.fields.find((entry) => 'name' in entry && entry.name === name) as Field & {
    type: string
    relationTo?: string
    options?: unknown
    defaultValue?: unknown
    required?: boolean
    admin?: { readOnly?: boolean; date?: { pickerAppearance?: string; displayFormat?: string } }
    access?: { update?: (args: Record<string, unknown>) => boolean | Promise<boolean> }
  }

describe('Enrollments collection fields', () => {
  it('defines the registration and lifecycle fields', () => {
    expect(Enrollments.fields.map((entry) => ('name' in entry ? entry.name : undefined))).toEqual(
      expect.arrayContaining([
        'student',
        'course',
        'class',
        'enrollmentStatus',
        'paymentStatus',
        'registrationSource',
        'registeredAt',
        'confirmedAt',
        'classAssignedAt',
        'cancelledAt',
        'createdBy',
        'payments',
      ]),
    )
  })

  it('makes paymentStatus read-only — staff never choose it by hand, it is derived (FR-032)', () => {
    expect(field('paymentStatus').admin?.readOnly).toBe(true)
  })

  it('exposes payments as a join field back to the payments collection', () => {
    expect(field('payments')).toMatchObject({
      type: 'join',
      collection: 'payments',
      on: 'enrollmentId',
    })
  })

  it('requires the student and course relationships', () => {
    expect(field('student')).toMatchObject({
      type: 'relationship',
      relationTo: 'students',
      required: true,
    })
    expect(field('course')).toMatchObject({
      type: 'relationship',
      relationTo: 'courses',
      required: true,
    })
  })

  it('locks student and course from being changed after creation', async () => {
    const student = field('student')
    const course = field('course')
    expect(typeof student.access?.update).toBe('function')
    expect(typeof course.access?.update).toBe('function')

    const args = {} as Record<string, unknown>
    expect(await student.access!.update!(args)).toBe(false)
    expect(await course.access!.update!(args)).toBe(false)
  })

  it('keeps class and creator relationships optional', () => {
    expect(field('class')).toMatchObject({ type: 'relationship', relationTo: 'classes' })
    expect(field('createdBy')).toMatchObject({
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    })
    expect(field('class').required).not.toBe(true)
    expect(field('createdBy').required).not.toBe(true)
  })

  it('uses the requested lifecycle enums and defaults', () => {
    expect(field('enrollmentStatus')).toMatchObject({
      options: [
        { value: 'NEW', label: { vi: 'Mới đăng ký', en: 'New' } },
        { value: 'CONFIRMED', label: { vi: 'Đã xác nhận', en: 'Confirmed' } },
        { value: 'ATTENDED', label: { vi: 'Đã vào học', en: 'Attended' } },
        { value: 'COMPLETED', label: { vi: 'Đã hoàn thành', en: 'Completed' } },
        { value: 'CANCELLED', label: { vi: 'Đã hủy', en: 'Cancelled' } },
      ],
      defaultValue: 'NEW',
      required: true,
    })
    expect(field('paymentStatus')).toMatchObject({
      options: [
        { value: 'UNPAID', label: { vi: 'Chưa thanh toán', en: 'Unpaid' } },
        { value: 'PAID', label: { vi: 'Đã thanh toán', en: 'Paid' } },
      ],
      defaultValue: 'UNPAID',
      required: true,
    })
    expect(field('registrationSource')).toMatchObject({
      options: [
        { value: 'SELF_REGISTRATION', label: { vi: 'Tự đăng ký', en: 'Self-registration' } },
        { value: 'ADMIN_CREATED', label: { vi: 'Admin tạo', en: 'Admin-created' } },
      ],
      defaultValue: 'ADMIN_CREATED',
      required: true,
      admin: { readOnly: true },
    })
  })

  it('defaults registeredAt to the current time and enables timestamps', () => {
    expect(typeof field('registeredAt').defaultValue).toBe('function')
    expect(Enrollments.timestamps).toBe(true)
  })

  it('renders lifecycle timestamps as read-only HCM datetime fields', () => {
    for (const name of ['registeredAt', 'confirmedAt', 'classAssignedAt', 'cancelledAt']) {
      expect(field(name)).toMatchObject({
        admin: {
          readOnly: true,
          date: {
            pickerAppearance: 'dayAndTime',
            displayFormat: 'dd/MM/yyyy HH:mm:ss',
          },
        },
      })
    }
  })
})

describe('Enrollments collection access and admin metadata', () => {
  it('is staff-only', () => {
    expect(Enrollments.access).toMatchObject({
      create: authenticated,
      read: authenticated,
      update: authenticated,
      delete: authenticated,
    })
  })

  it('is registered under the academic admin group', () => {
    expect(Enrollments.slug).toBe('enrollments')
    expect(Enrollments.admin?.group).toMatchObject({ en: 'Academic' })
    expect(Enrollments.admin?.defaultColumns).toEqual(
      expect.arrayContaining(['student', 'course', 'enrollmentStatus', 'paymentStatus']),
    )
  })
})

describe('Enrollments registration in the Payload config', () => {
  it('is registered as a collection', async () => {
    const config = await configPromise

    expect(config.collections.map((collection) => collection.slug)).toContain('enrollments')
  })
})
