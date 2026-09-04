import { describe, it, expect } from 'vitest'

import { maskEmail } from '@/lib/mask-email'

describe('maskEmail', () => {
  it('keeps the first two local characters and the whole domain', () => {
    expect(maskEmail('nguyen@gmail.com')).toBe('ng***@gmail.com')
  })

  it('masks the entire local part when it is two characters or shorter', () => {
    expect(maskEmail('ab@example.com')).toBe('**@example.com')
    expect(maskEmail('a@example.com')).toBe('*@example.com')
  })
})
