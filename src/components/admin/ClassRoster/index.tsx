'use client'

/**
 * Lives on a class's own edit view (a `ui` field in `Classes`, specs/013): the two directions
 * of assigning students in one place — the current roster, each row with a "remove" action,
 * and a "Thêm học viên" button that opens Payload's own `enrollments` list drawer, already
 * filtered to this class's course. Talks to `/api/enrollments` directly for reads and for the
 * single-row removal (mirrors `src/components/admin/NotificationBell`, specs/011 Decision 1);
 * the batch assignment itself goes through `assignStudentsToClassAction` — a Server Action,
 * not REST, since it is a plain Next.js function call from a client component and needs no
 * separate transport.
 *
 * Renders nothing until the class has been saved once — there is no class id yet to assign
 * anyone into (mirrors how Payload's own `join` fields behave before the first save).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, useConfig, useDocumentInfo, useListDrawer } from '@payloadcms/ui'
import { requests } from '@payloadcms/ui/utilities/api'
import { formatAdminURL } from 'payload/shared'
import type { CollectionSlug, PaginatedDocs, Where } from 'payload'

import { assignStudentsToClassAction } from '@/actions/admin/assign-students-to-class'
import { relationshipId } from '@/utilities/relationshipId'
import type { Enrollment } from '@/payload-types'

type RosterEntry = Pick<Enrollment, 'id' | 'student'>

const buildURL = (apiRoute: string, path: `/${string}`, query: string) =>
  `${formatAdminURL({ apiRoute, path })}${query}`

// Module-level, not inline in the hook call: `useListDrawer` caches by this array's
// reference identity too (same trap as `filterOptions` below) — a literal recreated every
// render would defeat that cache just as surely.
const ENROLLMENTS_COLLECTION_SLUGS: CollectionSlug[] = ['enrollments']

const studentLabel = ({ student }: RosterEntry): string => {
  if (student && typeof student === 'object') return student.fullName || student.email
  return `#${student}`
}

export const ClassRoster: React.FC = () => {
  const { id: classId, data } = useDocumentInfo()
  const { config } = useConfig()
  const apiRoute = config.routes.api

  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const courseId = relationshipId(data?.course)

  const loadRoster = useCallback(async () => {
    if (!classId) return

    const res = await requests.get(buildURL(apiRoute, '/enrollments', ''), {
      params: { where: { class: { equals: classId } }, depth: 1, limit: 100 },
    })
    const data: PaginatedDocs<RosterEntry> = await res.json()
    setRoster(data.docs ?? [])
  }, [apiRoute, classId])

  useEffect(() => {
    const load = async () => {
      await loadRoster()
    }
    void load()
  }, [loadRoster])

  // `useListDrawer` caches its internal effect by the reference identity of
  // `filterOptions` (see INVARIANTS.md) — a fresh object on every render defeats that cache
  // and refetches the drawer's list on every render, not just when the filter's meaning
  // actually changes. `useMemo`, keyed on the one value that should trigger a refetch.
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
      await requests.patch(buildURL(apiRoute, `/enrollments/${enrollmentId}`, ''), {
        body: JSON.stringify({ class: null }),
        headers: { 'Content-Type': 'application/json' },
      })
      setIsBusy(false)
      await loadRoster()
    },
    [apiRoute, loadRoster],
  )

  if (!classId) return null

  return (
    <div className="class-roster">
      <h3>Học viên trong lớp</h3>

      {roster.length === 0 ? <p>Chưa có học viên nào trong lớp.</p> : null}

      {roster.length > 0 ? (
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
      ) : null}

      <DrawerToggler disabled={isBusy || !courseId}>Thêm học viên</DrawerToggler>
      <ListDrawer enableRowSelections onBulkSelect={handleBulkSelect} />

      {message ? <p role="status">{message}</p> : null}
    </div>
  )
}
