import { describe, expect, it } from 'vitest'
import { parseProfileInput } from '@/lib/validation/profile-schema'

describe('profile-schema', () => {
  it('accepts valid full name and phone number', () => {
    const res = parseProfileInput({
      fullName: 'Nguyễn Văn A',
      phone: '0987654321',
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.fullName).toBe('Nguyễn Văn A')
      expect(res.data.phone).toBe('0987654321')
    }
  })

  it('accepts empty or whitespace-only phone as null/empty', () => {
    const res = parseProfileInput({
      fullName: 'Trần Thị B',
      phone: '',
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.phone).toBeNull()
    }
  })

  it('rejects full name exceeding 255 characters', () => {
    const res = parseProfileInput({
      fullName: 'A'.repeat(256),
      phone: '0912345678',
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errors.fullName).toBeDefined()
    }
  })

  it('rejects invalid Vietnamese phone number format', () => {
    const res = parseProfileInput({
      fullName: 'Lê Văn C',
      phone: '123456',
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errors.phone).toBeDefined()
    }
  })
})
