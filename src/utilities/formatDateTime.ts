const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
})

/** Formats date to DD/MM/YYYY in Asia/Ho_Chi_Minh timezone to avoid SSR hydration mismatch. */
export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—'
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return '—'

  return VN_DATE.format(date)
}

export const formatDateTime = (timestamp: string): string => {
  const date = timestamp ? new Date(timestamp) : new Date()
  const MM = String(date.getMonth() + 1).padStart(2, '0')
  const DD = String(date.getDate()).padStart(2, '0')
  const YYYY = date.getFullYear()
  return `${MM}/${DD}/${YYYY}`
}
