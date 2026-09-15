/**
 * Vietnamese-style thousands grouping for the `amount` field's admin input
 * (`1000000` ⇄ `"1.000.000"`). The stored/validated value is always the plain
 * integer — these only shape what staff see and type.
 */
export const formatAmountDisplay = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return new Intl.NumberFormat('vi-VN').format(value)
}

export const parseAmountInput = (raw: string): number | null => {
  const digitsOnly = raw.replace(/\D/g, '')
  if (digitsOnly === '') return null
  return Number(digitsOnly)
}
