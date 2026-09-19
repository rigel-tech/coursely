'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, useDocumentInfo, useListDrawer } from '@payloadcms/ui'
import type { CollectionSlug, Where } from 'payload'

import {
  assignStudentsToClassAction,
  getClassRosterAction,
  removeStudentFromClassAction,
} from '@/actions/admin/assign-students-to-class'
import { relationshipId } from '@/utilities/relationshipId'
import type { Enrollment } from '@/payload-types'

type RosterEntry = Pick<Enrollment, 'id' | 'student'>

const ENROLLMENTS_COLLECTION_SLUGS: CollectionSlug[] = ['enrollments']

const studentLabel = ({ student }: RosterEntry): string => {
  if (typeof student === 'object' && student) {
    return student.fullName || student.email
  }
  return `#${student}`
}

export const ClassRoster: React.FC = () => {
  const { id: classId, data } = useDocumentInfo()

  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const courseId = relationshipId(data?.course)

  const loadRoster = useCallback(async () => {
    if (!classId) return

    const result = await getClassRosterAction({ classId: Number(classId) })

    if (result.status === 'error') {
      setMessage(result.message)
      return
    }

    setRoster(result.docs as RosterEntry[])
  }, [classId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRoster()
  }, [loadRoster])

  const filterOptions = useMemo(() => {
    const eligibleFilter: Where = courseId
      ? {
          and: [
            { course: { equals: courseId } },
            { enrollmentStatus: { equals: 'CONFIRMED' } },
            { class: { exists: false } },
          ],
        }
      : { id: { equals: -1 } }

    return { enrollments: eligibleFilter }
  }, [courseId])

  const [ListDrawer, DrawerToggler, { closeDrawer }] = useListDrawer({
    collectionSlugs: ENROLLMENTS_COLLECTION_SLUGS,
    filterOptions,
  })

  const handleBulkSelect = useCallback(
    async (selected: Map<number | string, boolean>) => {
      if (!classId) return

      const enrollmentIds = [...selected.entries()]
        .filter(([, isSelected]) => isSelected)
        .map(([id]) => Number(id))

      closeDrawer()
      setIsBusy(true)

      const result = await assignStudentsToClassAction({
        classId: Number(classId),
        enrollmentIds,
      })

      setIsBusy(false)

      if (result.status === 'error') {
        setMessage(result.message)
        return
      }

      setMessage(null)
      await loadRoster()
    },
    [classId, closeDrawer, loadRoster],
  )

  const removeFromClass = useCallback(
    async (enrollmentId: number) => {
      setIsBusy(true)

      const result = await removeStudentFromClassAction({ enrollmentId })

      setIsBusy(false)

      if (result.status === 'error') {
        setMessage(result.message)
        return
      }

      setMessage(null)
      await loadRoster()
    },
    [loadRoster],
  )

  if (!classId) return null

  return (
    <div className="class-roster">
      <h3>Học viên trong lớp</h3>

      {roster.length === 0 && <p>Chưa có học viên nào trong lớp.</p>}

      {roster.length > 0 && (
        <ul>
          {roster.map((entry) => (
            <li key={entry.id}>
              <span>{studentLabel(entry)}</span>
              <Button
                buttonStyle="secondary"
                disabled={isBusy}
                onClick={() => removeFromClass(entry.id)}
                size="small"
              >
                Bỏ khỏi lớp
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DrawerToggler disabled={isBusy || !courseId}>Thêm học viên</DrawerToggler>
      <ListDrawer enableRowSelections onBulkSelect={handleBulkSelect} />

      {message && <p role="status">{message}</p>}
    </div>
  )
}
