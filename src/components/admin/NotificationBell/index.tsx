'use client'

/**
 * The admin-panel counterpart to `src/components/public/NotificationBell` (specs/010):
 * shows staff-facing notifications — rows with no `student` (specs/011). Talks directly
 * to Payload's own generated REST endpoints for `notifications` (no custom Next.js route
 * or Server Action — staff already pass the collection's own `authenticated` access,
 * research.md Decision 1). `limit: 0` on `find` is not a count shortcut (it disables
 * pagination and returns every row — see INVARIANTS.md), so the count comes from the
 * collection's own `/count` endpoint instead.
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Popup, useConfig } from '@payloadcms/ui'
import { requests } from '@payloadcms/ui/utilities/api'
import { formatAdminURL } from 'payload/shared'

const POLL_INTERVAL_MS = 5_000

type StaffNotification = {
  id: number
  content: string
  title: string
}

const buildURL = (apiRoute: string, path: `/${string}`, query: string) =>
  `${formatAdminURL({ apiRoute, path })}${query}`

export const NotificationBell: React.FC = () => {
  const { config } = useConfig()
  const apiRoute = config.routes.api
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<StaffNotification[]>([])

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      requests
        .get(buildURL(apiRoute, '/notifications/count', ''), {
          params: { where: { student: { exists: false }, isRead: { equals: false } } },
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
      params: { where: { student: { exists: false } }, sort: '-createdAt', limit: 20 },
    })
    const data = await res.json()
    const docs: StaffNotification[] = data.docs ?? []
    setNotifications(docs)

    if (docs.length === 0) return

    const idsQuery = docs.map((doc, i) => `where[id][in][${i}]=${doc.id}`).join('&')
    await requests.patch(buildURL(apiRoute, '/notifications', `?${idsQuery}`), {
      body: JSON.stringify({ isRead: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    setCount(0)
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
