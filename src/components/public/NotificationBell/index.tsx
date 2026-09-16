'use client'

import { Bell } from 'lucide-react'
import * as React from 'react'
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
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      // A hidden tab has no visible badge to update — skip the request rather than pay
      // for one nobody can see.
      if (document.visibilityState === 'hidden') return

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

    // Catch up immediately on return, rather than waiting out whatever is left of the
    // current interval.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
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
    const nextOpen = !open
    setOpen(nextOpen)

    if (nextOpen) {
      // Clear any list left over from the previous open so it never flashes stale content
      // while this fetch is in flight.
      setItems(null)
      setHasNextPage(false)
      // Fetching the list is what marks it read (FR-005) — fetched fresh on every open,
      // never cached from the last time. Kept outside the `setOpen` updater: React
      // StrictMode invokes a functional updater twice in dev, which would call the action
      // twice for one click.
      listNotificationsAction(1)
        .then(({ docs, hasNextPage: more }) => {
          setItems(docs)
          setPage(1)
          setHasNextPage(more)
          // The server just marked these read — reflect that now rather than waiting out
          // the rest of the current poll interval.
          setCount(0)
        })
        .catch(() => {
          setItems([])
        })
    }
  }

  const loadMore = () => {
    if (isLoadingMore || !hasNextPage) return
    setIsLoadingMore(true)

    listNotificationsAction(page + 1)
      .then(({ docs, hasNextPage: more }) => {
        setItems((prev) => (prev ?? []).concat(docs))
        setPage((prev) => prev + 1)
        setHasNextPage(more)
      })
      .catch(() => {
        setHasNextPage(false)
      })
      .finally(() => setIsLoadingMore(false))
  }

  // Fires while scrolling the open list — loads the next page once the reader nears the
  // bottom, instead of capping the bell at the first page forever.
  const handleListScroll = (event: React.UIEvent<HTMLUListElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 48) loadMore()
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
            <ul
              className="max-h-96 divide-y divide-border overflow-y-auto"
              onScroll={handleListScroll}
            >
              {items.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.content}</p>
                </li>
              ))}
              {isLoadingMore ? (
                <li className="px-4 py-3 text-center text-sm text-muted-foreground">
                  Đang tải thêm...
                </li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
