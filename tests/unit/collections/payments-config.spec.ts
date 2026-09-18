import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'

import { Payments, validatePaymentAmount } from '@/collections/Payments'
import { formatAmountDisplay, parseAmountInput } from '@/collections/Payments/formatAmount'
import { authenticated } from '@/access/authenticated'
import configPromise from '@/payload.config'

const named = (fields: Field[]) =>
  fields.map((f) => ('name' in f ? f.name : undefined)).filter(Boolean) as string[]

const field = (fields: Field[], name: string) => fields.find((f) => 'name' in f && f.name === name)

const bilingual = (label: unknown) => {
  expect(label && typeof label === 'object').toBe(true)
  const l = label as Record<string, string>
  expect(l.vi).toBeTruthy()
  expect(l.en).toBeTruthy()
}

const CORE_FIELDS = [
  'enrollmentId',
  'studentId',
  'amount',
  'paymentMethod',
  'paymentDate',
  'userId',
  'referenceNote',
]

describe('Payments fields', () => {
  const names = named(Payments.fields)

  it('carries the core payment fields', () => {
    expect(names).toEqual(expect.arrayContaining(CORE_FIELDS))
  })

  it('requires enrollmentId, studentId, amount, paymentMethod, paymentDate', () => {
    for (const name of ['enrollmentId', 'studentId', 'amount', 'paymentMethod', 'paymentDate']) {
      const f = field(Payments.fields, name) as { required?: boolean } | undefined
      expect(f, `field ${name} should exist`).toBeTruthy()
      expect(f?.required, `field ${name} should be required`).toBe(true)
    }
  })

  it('leaves userId and referenceNote optional', () => {
    for (const name of ['userId', 'referenceNote']) {
      const f = field(Payments.fields, name) as { required?: boolean } | undefined
      expect(f?.required, `field ${name} should not be required`).toBeFalsy()
    }
  })

  it('types enrollmentId as a relationship to enrollments', () => {
    const f = field(Payments.fields, 'enrollmentId') as Extract<Field, { type: 'relationship' }>
    expect(f?.type).toBe('relationship')
    expect(f?.relationTo).toBe('enrollments')
    expect(f?.required).toBe(true)
  })

  it('types enrollmentId as read-only — staff never pick or change it by hand', () => {
    const f = field(Payments.fields, 'enrollmentId') as
      { admin?: { readOnly?: boolean } } | undefined
    expect(f?.admin?.readOnly).toBe(true)
  })

  it('types studentId as a relationship to students', () => {
    const f = field(Payments.fields, 'studentId') as Extract<Field, { type: 'relationship' }>
    expect(f?.type).toBe('relationship')
    expect(f?.relationTo).toBe('students')
    expect(f?.required).toBe(true)
  })

  it('types studentId as read-only — auto-set from the enrollment, staff never pick or change it by hand', () => {
    const f = field(Payments.fields, 'studentId') as { admin?: { readOnly?: boolean } } | undefined
    expect(f?.admin?.readOnly).toBe(true)
  })

  it('does not block an empty studentId at validate time — the create-time hook fills it, and a client-side required check on a value the user never enters would lock the create drawer after any other field fails validation once', () => {
    const f = field(Payments.fields, 'studentId') as
      { validate?: (value: unknown, ctx: unknown) => unknown } | undefined
    expect(f?.validate, 'studentId should define a custom validate').toBeTruthy()
    expect(f?.validate?.(undefined, {} as never)).toBe(true)
    expect(f?.validate?.('', {} as never)).toBe(true)
  })

  it('types userId as a relationship to users', () => {
    const f = field(Payments.fields, 'userId') as Extract<Field, { type: 'relationship' }>
    expect(f?.type).toBe('relationship')
    expect(f?.relationTo).toBe('users')
    expect(f?.required).toBeFalsy()
  })

  it('types userId as read-only — staff never pick it by hand, it is auto-set to the creator', () => {
    const f = field(Payments.fields, 'userId') as { admin?: { readOnly?: boolean } } | undefined
    expect(f?.admin?.readOnly).toBe(true)
  })

  it('types paymentDate as a read-only date field — staff never enter it by hand', () => {
    const f = field(Payments.fields, 'paymentDate') as
      { type?: string; admin?: { readOnly?: boolean } } | undefined
    expect(f?.type).toBe('date')
    expect(f?.admin?.readOnly).toBe(true)
  })

  it('does not block an empty paymentDate at validate time — same create-time-hook-fills-it reasoning as studentId', () => {
    const f = field(Payments.fields, 'paymentDate') as
      { validate?: (value: unknown, ctx: unknown) => unknown } | undefined
    expect(f?.validate, 'paymentDate should define a custom validate').toBeTruthy()
    expect(f?.validate?.(undefined, {} as never)).toBe(true)
    expect(f?.validate?.('', {} as never)).toBe(true)
  })

  it('types referenceNote as a textarea', () => {
    const f = field(Payments.fields, 'referenceNote') as { type?: string } | undefined
    expect(f?.type).toBe('textarea')
  })

  it('restricts paymentMethod to the four fixed options, each with a bilingual label', () => {
    const pm = field(Payments.fields, 'paymentMethod') as Extract<Field, { type: 'select' }>
    expect(pm?.type).toBe('select')
    expect(pm?.required).toBe(true)

    const values = pm.options.map((o) => (typeof o === 'string' ? o : o.value))
    expect(values).toEqual(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'])

    for (const opt of pm.options) {
      expect(typeof opt).not.toBe('string')
      bilingual((opt as { label: unknown }).label)
    }
    bilingual(pm.label)
  })

  it('carries a bilingual label on every core field', () => {
    for (const name of CORE_FIELDS) {
      bilingual((field(Payments.fields, name) as { label?: unknown } | undefined)?.label)
    }
  })
})

describe('Payments access', () => {
  it('gates create, read, update, delete behind the shared `authenticated` predicate', () => {
    expect(Payments.access?.create).toBe(authenticated)
    expect(Payments.access?.read).toBe(authenticated)
    expect(Payments.access?.update).toBe(authenticated)
    expect(Payments.access?.delete).toBe(authenticated)
  })
})

describe('Payments registration in the Payload config', () => {
  it('is registered as a collection', async () => {
    const config = await configPromise
    expect(config.collections.map((c) => c.slug)).toContain('payments')
  })
})

describe('amount field admin components', () => {
  it('renders the list-view amount through AmountCell', () => {
    const f = field(Payments.fields, 'amount') as
      { admin?: { components?: { Cell?: unknown } } } | undefined
    expect(f?.admin?.components?.Cell).toBe(
      '@/collections/Payments/components/AmountCell#AmountCell',
    )
  })
})

describe('enrollmentId field admin components', () => {
  it('renders the list-view enrollment reference through EnrollmentCell', () => {
    const f = field(Payments.fields, 'enrollmentId') as
      { admin?: { components?: { Cell?: unknown } } } | undefined
    expect(f?.admin?.components?.Cell).toBe(
      '@/collections/Payments/components/EnrollmentCell#EnrollmentCell',
    )
  })
})

describe('validatePaymentAmount', () => {
  const cases: Array<[number, boolean]> = [
    [-100, false],
    [0, false],
    [1000.5, false],
    [1, true],
    [500000, true],
  ]

  it.each(cases)('amount %p is valid=%p', (value, expectValid) => {
    const result = validatePaymentAmount(value, {} as Parameters<typeof validatePaymentAmount>[1])
    if (expectValid) {
      expect(result).toBe(true)
    } else {
      expect(result).not.toBe(true)
    }
  })
})

describe('formatAmountDisplay', () => {
  it('groups digits with Vietnamese thousands separators', () => {
    expect(formatAmountDisplay(1000000)).toBe('1.000.000')
    expect(formatAmountDisplay(500)).toBe('500')
    expect(formatAmountDisplay(0)).toBe('0')
  })

  it('renders an empty string for null, undefined, or NaN', () => {
    expect(formatAmountDisplay(null)).toBe('')
    expect(formatAmountDisplay(undefined)).toBe('')
    expect(formatAmountDisplay(NaN)).toBe('')
  })
})

describe('parseAmountInput', () => {
  it('strips grouping separators back to a plain integer', () => {
    expect(parseAmountInput('1.000.000')).toBe(1000000)
    expect(parseAmountInput('500')).toBe(500)
  })

  it('returns null for empty or non-numeric input', () => {
    expect(parseAmountInput('')).toBeNull()
    expect(parseAmountInput('abc')).toBeNull()
  })
})
