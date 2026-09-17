'use server'

import { headers } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { assignStudentsToClass } from '@/services/class-assignment'
import { ClassCourseMismatch, ClassFull, EnrollmentNotAssignable } from '@/lib/errors/enrollment'
import type { AssignStudentsState } from '@/lib/constants/assign-students-state'

export type { AssignStudentsState }

/**
 * Staff-only — `payload.auth` resolves `user` from the incoming request's own cookies via
 * `headers()`, the same mechanism `src/app/(frontend)/next/preview/route.ts` already uses to
 * authenticate outside a REST request. Every refusal is returned, never thrown, so the
 * client's `.catch()` never flattens it into a generic message (see INVARIANTS.md).
 */
export async function assignStudentsToClassAction({
  classId,
  enrollmentIds,
}: {
  classId: number
  enrollmentIds: number[]
}): Promise<AssignStudentsState> {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  if (user?.collection !== 'users') {
    return { status: 'error', message: 'Bạn không có quyền thực hiện thao tác này.' }
  }

  try {
    await assignStudentsToClass({ classId, enrollmentIds })
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
