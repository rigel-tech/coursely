export const formatAmountDisplay = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return new Intl.NumberFormat('vi-VN').format(value)
}

export const parseAmountInput = (raw: string): number | null => {
  const digitsOnly = raw.replace(/\D/g, '')
  if (digitsOnly === '') return null
  return Number(digitsOnly)
}
