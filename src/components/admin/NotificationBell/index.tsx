'use client'

/**
 * The admin-panel counterpart to `src/components/public/NotificationBell` (specs/010):
 * shows staff-facing notifications (where `student` does not exist). Talks directly to
 * Payload's own generated REST endpoints for `notifications` (no custom Next.js route or
 * Server Action — staff already pass the collection's own `authenticated` access,
 * research.md Decision 1). `limit: 0` on `find` is not a count shortcut (it disables
 * pagination and returns every row — see INVARIANTS.md), so the count comes from the
 * collection's own `/count` endpoint instead.
 *
 * Opening the list marks rows read.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Popup, useConfig } from '@payloadcms/ui'
import { requests } from '@payloadcms/ui/utilities/api'
import { formatAdminURL } from 'payload/shared'
import type { PaginatedDocs } from 'payload'
import { Bell } from 'lucide-react'
import type { Notification } from '@/payload-types'
import './index.css'

const POLL_INTERVAL_MS = 5_000

type AdminNotification = Pick<Notification, 'id' | 'content' | 'title' | 'student'>

const buildURL = (apiRoute: string, path: `/${string}`, query: string) =>
  `${formatAdminURL({ apiRoute, path })}${query}`

export const NotificationBell: React.FC = () => {
  const { config } = useConfig()
  const apiRoute = config.routes.api
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])

  // Staff-only, unread — a student's own unread notification must never keep this badge
  // above 0, since nothing here ever marks that row read (that is
  // `student-notifications.ts`'s job, from the student's own session).
  const refreshCount = useCallback(async () => {
    try {
      const res = await requests.get(buildURL(apiRoute, '/notifications/count', ''), {
        params: { where: { isRead: { equals: false }, student: { exists: false } } },
      })
      const data: { totalDocs?: unknown } = await res.json()
      if (typeof data?.totalDocs === 'number') setCount(data.totalDocs)
    } catch {
      // A failed poll stays quiet — the header has nothing useful to say about it.
    }
  }, [apiRoute])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      if (!cancelled) await refreshCount()
    }

    void poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [refreshCount])

  const loadList = useCallback(async () => {
    const res = await requests.get(buildURL(apiRoute, '/notifications', ''), {
      params: {
        sort: '-createdAt',
        limit: 20,
        depth: 0,
        where: { student: { exists: false } },
      },
    })
    const data: PaginatedDocs<AdminNotification> = await res.json()
    const docs = data.docs ?? []
    setNotifications(docs)

    // A row with a `student` is that student's own notification — leave it for
    // `student-notifications.ts` to mark read, never mark it read on their behalf here.
    const staffDocs = docs.filter((doc) => !doc.student)
    if (staffDocs.length === 0) return

    // `isRead[equals]=false` first: among the 20 most recent, some staff-facing rows may
    // already be read — patching those again would only rewrite their `updatedAt` for
    // nothing.
    const idsQuery = staffDocs.map((doc, i) => `where[id][in][${i}]=${doc.id}`).join('&')
    await requests.patch(
      buildURL(apiRoute, '/notifications', `?where[isRead][equals]=false&${idsQuery}`),
      {
        body: JSON.stringify({ isRead: true }),
        headers: { 'Content-Type': 'application/json' },
      },
    )
    // The server, not a local subtraction, decides the next count — subtracting
    // `staffDocs.length` would over-count rows among those 20 that were already read.
    await refreshCount()
  }, [apiRoute, refreshCount])

  return (
    <Popup
      button={
        <>
          <Bell aria-label="Thông báo" size={20} strokeWidth={1.75} />
          {count > 0 ? <span>{count}</span> : null}
        </>
      }
      onToggleOpen={(active) => {
        if (active) void loadList()
      }}
      portalClassName="notification-bell-popup"
      render={() => (
        <ul>
          {notifications.length === 0 && <li>Không có thông báo</li>}
          {notifications.map((notification) => (
            <li key={notification.id}>
              <strong>{notification.title}</strong>
              <p>{notification.content}</p>
            </li>
          ))}
        </ul>
      )}
    />
  )
}
