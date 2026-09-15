import type { Course } from '@/payload-types'

/** Label for each `courseType` — shared so a new type gets caught here, not silently mislabeled. */
export const COURSE_TYPE_LABEL: Record<Course['courseType'], string> = {
  MOODLE: 'Moodle E-Learning',
  OFFLINE: 'Lớp học Offline',
}
