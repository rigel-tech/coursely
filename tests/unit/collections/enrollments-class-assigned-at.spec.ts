import { describe, expect, it } from 'vitest'

import { setClassAssignedAt } from '@/collections/Enrollments/hooks/setClassAssignedAt'

const run = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
  setClassAssignedAt({ data, originalDoc, operation: 'update' } as never) as Record<string, unknown>

describe('Enrollments setClassAssignedAt hook', () => {
  it('stamps classAssignedAt when an enrollment gains a class', () => {
    const before = Date.now()
    const result = run({ class: 4 }, { class: null, classAssignedAt: null })
    const after = Date.now()

    const stampedAt = new Date(result.classAssignedAt as string).getTime()
    expect(stampedAt).toBeGreaterThanOrEqual(before)
    expect(stampedAt).toBeLessThanOrEqual(after)
  })

  it('stamps classAssignedAt when an enrollment is created straight into a class', () => {
    const result = setClassAssignedAt({
      data: { class: 4 },
      operation: 'create',
    } as never) as Record<string, unknown>

    expect(result.classAssignedAt).toBeTruthy()
  })

  it('clears classAssignedAt when an enrollment is taken out of its class', () => {
    const result = run({ class: null }, { class: 4, classAssignedAt: '2026-01-01T00:00:00.000Z' })

    expect(result.class).toBeNull()
    expect(result.classAssignedAt).toBeNull()
  })

  it('leaves classAssignedAt untouched when the class is unchanged', () => {
    const result = run(
      { class: 4, paymentStatus: 'PAID' },
      { class: 4, classAssignedAt: '2026-01-01T00:00:00.000Z' },
    )

    expect(result.classAssignedAt).toBeUndefined()
  })

  it('leaves classAssignedAt untouched when the write does not mention the class at all', () => {
    const result = run(
      { paymentStatus: 'PAID' },
      { class: 4, classAssignedAt: '2026-01-01T00:00:00.000Z' },
    )

    expect(result.classAssignedAt).toBeUndefined()
  })
})
