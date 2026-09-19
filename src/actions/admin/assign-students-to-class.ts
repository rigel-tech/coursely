'use server'

import { headers } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { assignStudentsToClass } from '@/services/class-assignment'
import { ClassCourseMismatch, ClassFull, EnrollmentNotAssignable } from '@/lib/errors/enrollment'

export type AssignStudentsState =
  { status: 'success'; assigned: number } | { status: 'error'; message: string }
export type AssignStudentsParams = {
  classId: number
  enrollmentIds: number[]
}

export async function assignStudentsToClassAction({
  classId,
  enrollmentIds,
}: AssignStudentsParams): Promise<AssignStudentsState> {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  if (user?.collection !== 'users') {
    return { status: 'error', message: 'Bạn không có quyền thực hiện thao tác này.' }
  }

  try {
    await assignStudentsToClass(classId, enrollmentIds)
  } catch (error) {
    if (
      error instanceof ClassFull ||
      error instanceof ClassCourseMismatch ||
      error instanceof EnrollmentNotAssignable
    ) {
      return { status: 'error', message: error.message }
    }
    throw error
  }

  return { status: 'success', assigned: enrollmentIds.length }
}

export const getClassRosterAction = async (classId: number) => {
  try {
    const payload = await getPayload({ config: configPromise })
    const { docs } = await payload.find({
      collection: 'enrollments',
      where: { class: { equals: classId } },
      depth: 1,
      limit: 100,
    })

    return { status: 'success', docs }
  } catch {
    return { status: 'error', message: 'Không thể tải danh sách học viên', docs: [] }
  }
}

export const removeStudentFromClassAction = async ({ enrollmentId }: { enrollmentId: number }) => {
  try {
    const payload = await getPayload({ config: configPromise })
    await payload.update({
      collection: 'enrollments',
      id: enrollmentId,
      data: { class: null },
    })

    return { status: 'success' as const }
  } catch {
    return { status: 'error' as const, message: 'Không thể xóa học viên khỏi lớp' }
  }
}
