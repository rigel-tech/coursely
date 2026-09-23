import { formatDate } from '@/utilities/formatDateTime'
import type { ClassScheduleInfo } from '../types'

export function formatScheduleDetails({
  startDate,
  scheduleTime,
  location,
}: Pick<ClassScheduleInfo, 'startDate' | 'scheduleTime' | 'location'>): string {
  const details: string[] = []
  if (startDate) details.push(`Khai giảng: ${formatDate(startDate)}`)
  if (scheduleTime) details.push(`Lịch học: ${scheduleTime}`)
  if (location) details.push(`Địa điểm: ${location}`)

  return details.length > 0 ? ` (${details.join(' · ')})` : ''
}
