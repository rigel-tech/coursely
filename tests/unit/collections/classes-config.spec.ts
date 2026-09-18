import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'

import { Classes, validateClassEndDate } from '@/collections/Classes'

const field = (fields: Field[], name: string) => fields.find((f) => 'name' in f && f.name === name)

const endDateField = () => {
  const row = Classes.fields.find((f): f is Extract<Field, { type: 'row' }> => f.type === 'row')
  return field(row?.fields ?? [], 'endDate') as { validate?: unknown } | undefined
}

describe('validateClassEndDate', () => {
  it('rejects an endDate earlier than startDate', () => {
    const result = validateClassEndDate('2026-01-01', {
      siblingData: { startDate: '2026-02-01' },
    } as Parameters<typeof validateClassEndDate>[1])
    expect(result).not.toBe(true)
  })

  it('accepts an endDate equal to or later than startDate', () => {
    const equal = validateClassEndDate('2026-02-01', {
      siblingData: { startDate: '2026-02-01' },
    } as Parameters<typeof validateClassEndDate>[1])
    expect(equal).toBe(true)

    const later = validateClassEndDate('2026-03-01', {
      siblingData: { startDate: '2026-02-01' },
    } as Parameters<typeof validateClassEndDate>[1])
    expect(later).toBe(true)
  })

  it('accepts an empty endDate — the field is optional', () => {
    const empty = validateClassEndDate(undefined, {
      siblingData: { startDate: '2026-02-01' },
    } as Parameters<typeof validateClassEndDate>[1])
    expect(empty).toBe(true)

    const nullValue = validateClassEndDate(null, {
      siblingData: { startDate: '2026-02-01' },
    } as Parameters<typeof validateClassEndDate>[1])
    expect(nullValue).toBe(true)
  })
})

describe('Classes endDate field', () => {
  it('wires validateClassEndDate as its validate function', () => {
    const f = endDateField()
    expect(typeof f?.validate).toBe('function')
    expect(f?.validate).toBe(validateClassEndDate)
  })
})
