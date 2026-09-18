export const formatAmountDisplay = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return new Intl.NumberFormat('vi-VN').format(value)
}

export const parseAmountInput = (raw: string): number | null => {
  // Only the vi-VN thousands separator ('.') is stripped — any other non-digit
  // character (a decimal point or comma from a pasted bank statement) means the
  // input isn't a plain integer, so it's rejected rather than silently
  // concatenated into a wildly wrong amount.
  const withoutSeparators = raw.replace(/\./g, '')
  if (!/^\d+$/.test(withoutSeparators)) return null

  const value = Number(withoutSeparators)
  return Number.isSafeInteger(value) ? value : null
}
