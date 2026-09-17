import { describe, expect, it } from 'vitest'
import type { Field } from 'payload'

import { Enrollments } from '@/collections/Enrollments'
import { ENROLLMENT_STATUS } from '@/components/public/enrollment-status'

const enrollmentStatusOptions = () => {
  const field = Enrollments.fields.find(
    (f): f is Field & { name: 'enrollmentStatus' } => 'name' in f && f.name === 'enrollmentStatus',
  )
  if (!field || field.type !== 'select') throw new Error('enrollmentStatus field not found')
  return field.options as { label: { vi: string; en: string }; value: string }[]
}

describe('ENROLLMENT_STATUS', () => {
  it('gives every status its own Badge variant — none shared', () => {
    const variants = Object.values(ENROLLMENT_STATUS).map((s) => s.variant)
    expect(new Set(variants).size).toBe(variants.length)
  })

  it('labels match the Enrollments collection exactly', () => {
    for (const option of enrollmentStatusOptions()) {
      expect(ENROLLMENT_STATUS[option.value as keyof typeof ENROLLMENT_STATUS].label).toBe(
        option.label.vi,
      )
    }
  })
})
