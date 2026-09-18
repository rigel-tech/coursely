const VN_DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
})

/**
 * Định dạng chuỗi ngày tháng sang định dạng DD/MM/YYYY chuẩn tiếng Việt theo múi giờ 'Asia/Ho_Chi_Minh'.
 * Cố định múi giờ để tránh hiện tượng React hydration mismatch giữa Node.js SSR (mặc định UTC) và trình duyệt.
 *
 * @example
 * formatDate('2026-09-30T17:00:00.000Z') // '01/10/2026'
 */
export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—'
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return '—'

  return VN_DATE.format(date)
}

export const formatDateTime = (timestamp: string): string => {
  return formatDate(timestamp)
}
