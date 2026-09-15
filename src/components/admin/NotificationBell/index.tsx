'use client'

/**
 * The admin-panel counterpart to `src/components/public/NotificationBell` (specs/010):
 * shows every row in the `notifications` collection, staff-facing and student-facing
 * alike. Talks directly to Payload's own generated REST endpoints for `notifications` (no
 * custom Next.js route or Server Action — staff already pass the collection's own
 * `authenticated` access, research.md Decision 1). `limit: 0` on `find` is not a count
 * shortcut (it disables pagination and returns every row — see INVARIANTS.md), so the
 * count comes from the collection's own `/count` endpoint instead.
 *
 * Opening the list marks rows read, but only the ones with no `student` — a row that
 * belongs to a student is that student's own unread notification (read through
 * `student-notifications.ts`), and staff merely glancing at it here must not silently mark
 * it read on the student's behalf.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Popup, useConfig } from '@payloadcms/ui'
import { requests } from '@payloadcms/ui/utilities/api'
import { formatAdminURL } from 'payload/shared'

const POLL_INTERVAL_MS = 5_000

type AdminNotification = {
  id: number
  content: string
  title: string
  student?: number | { id: number } | null
}

const buildURL = (apiRoute: string, path: `/${string}`, query: string) =>
  `${formatAdminURL({ apiRoute, path })}${query}`

export const NotificationBell: React.FC = () => {
  const { config } = useConfig()
  const apiRoute = config.routes.api
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      requests
        .get(buildURL(apiRoute, '/notifications/count', ''), {
          params: { where: { isRead: { equals: false } } },
        })
        .then((res) => res.json())
        .then((data: { totalDocs?: unknown }) => {
          if (!cancelled && typeof data?.totalDocs === 'number') setCount(data.totalDocs)
        })
        .catch(() => {
          // A failed poll stays quiet — the header has nothing useful to say about it.
        })
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [apiRoute])

  const loadList = useCallback(async () => {
    const res = await requests.get(buildURL(apiRoute, '/notifications', ''), {
      params: { sort: '-createdAt', limit: 20 },
    })
    const data = await res.json()
    const docs: AdminNotification[] = data.docs ?? []
    setNotifications(docs)

    // A row with a `student` is that student's own notification — leave it for
    // `student-notifications.ts` to mark read, never mark it read on their behalf here.
    const staffDocs = docs.filter((doc) => !doc.student)
    if (staffDocs.length === 0) return

    const idsQuery = staffDocs.map((doc, i) => `where[id][in][${i}]=${doc.id}`).join('&')
    await requests.patch(buildURL(apiRoute, '/notifications', `?${idsQuery}`), {
      body: JSON.stringify({ isRead: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    setCount((prev) => Math.max(0, prev - staffDocs.length))
  }, [apiRoute])

  return (
    <Popup
      button={
        <>
          <span aria-label="Thông báo">🔔</span>
          {count > 0 ? <span>{count}</span> : null}
        </>
      }
      onToggleOpen={(active) => {
        if (active) void loadList()
      }}
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
