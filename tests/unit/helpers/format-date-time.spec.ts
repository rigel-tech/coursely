import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from '@/utilities/formatDateTime'

describe('formatDate / formatDateTime — shared vi-VN timezone-pinned date formatter', () => {
  it('formats ISO UTC date string to DD/MM/YYYY in Asia/Ho_Chi_Minh timezone', () => {
    // 2026-09-30 17:00:00 UTC is 2026-10-01 00:00:00 GMT+7 (Asia/Ho_Chi_Minh)
    const result = formatDate('2026-09-30T17:00:00.000Z')
    expect(result).toBe('01/10/2026')
  })

  it('pads single-digit days and months with leading zeros', () => {
    // 2026-05-04 10:00:00 UTC -> 04/05/2026
    const result = formatDate('2026-05-04T10:00:00.000Z')
    expect(result).toBe('04/05/2026')
  })

  it('formats Date instance correctly', () => {
    const date = new Date('2026-12-25T00:00:00.000Z')
    const result = formatDate(date)
    expect(result).toBe('25/12/2026')
  })

  it('returns fallback "—" for null, undefined, empty string, or invalid date', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate('invalid-date-string')).toBe('—')
  })

  it('formatDateTime is an alias for formatDate', () => {
    expect(formatDateTime('2026-09-30T17:00:00.000Z')).toBe('01/10/2026')
  })
})
