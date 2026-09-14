'use client'

import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { listNotificationsAction } from '@/actions/student/notifications'
import type { Notification } from '@/payload-types'

const POLL_INTERVAL_MS = 5_000

/**
 * Rendered by `HeaderAuthControls` only once a student is confirmed signed in — this
 * component never checks auth itself. Polls the unread count every 5 seconds
 * (specs/010-notification-bell, FR-002); clicking it opens the recent-notifications list,
 * which marks that batch read as a side effect of `listNotificationsAction` (FR-005).
 */
export function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[] | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      fetch('/next/notifications-count')
        .then((res) => res.json())
        .then((data: { count?: unknown }) => {
          if (!cancelled && typeof data?.count === 'number') setCount(data.count)
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
  }, [])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleToggle = () => {
    setOpen((wasOpen) => {
      const nextOpen = !wasOpen
      if (nextOpen) {
        // Fetching the list is what marks it read (FR-005) — fetched fresh on every open,
        // never cached from the last time.
        listNotificationsAction().then(setItems)
      }
      return nextOpen
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative size-9 rounded-full border border-border/60 bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Thông báo"
        title="Thông báo"
      >
        <Bell className="size-4" />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-brand-accent-foreground ring-2 ring-background">
            {count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-md border border-border bg-card shadow-lg">
          {items === null ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Không có thông báo nào.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
