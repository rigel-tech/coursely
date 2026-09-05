'use client'

import { RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { useState } from 'react'

import { Button } from '@/components/public/ui/button'
import { Input } from '@/components/public/ui/input'
import type { Category } from '@/payload-types'

export interface CourseFiltersProps {
  categories?: Category[]
  activeCategory?: string
  activeType?: string
  activeQuery?: string
  activeStartDateFrom?: string
  activeStartDateTo?: string
  totalCount?: number
  allTotalCount?: number
}

/**
 * Course search, type (Offline / Moodle), category and date filter controls.
 */
export function CourseFilters({
  categories = [],
  activeCategory,
  activeType,
  activeQuery = '',
  activeStartDateFrom = '',
  activeStartDateTo = '',
  totalCount = 0,
  allTotalCount,
}: CourseFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(activeQuery)
  const [dateFrom, setDateFrom] = useState(activeStartDateFrom)
  const [dateTo, setDateTo] = useState(activeStartDateTo)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearch(val)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyFilters({ q: search })
    }
  }

  const applyFilters = (overrides?: {
    q?: string
    category?: string | null
    type?: string | null
    from?: string
    to?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())

    const newQ = overrides?.q !== undefined ? overrides.q : search
    if (newQ.trim()) {
      params.set('q', newQ.trim())
    } else {
      params.delete('q')
    }

    if (overrides && 'category' in overrides) {
      if (overrides.category && overrides.category !== 'all') {
        params.set('category', overrides.category)
      } else {
        params.delete('category')
      }
    }

    if (overrides && 'type' in overrides) {
      if (overrides.type && overrides.type !== 'all') {
        params.set('type', overrides.type)
      } else {
        params.delete('type')
      }
    }

    const newFrom = overrides?.from !== undefined ? overrides.from : dateFrom
    if (newFrom.trim()) {
      params.set('from', newFrom.trim())
    } else {
      params.delete('from')
    }

    const newTo = overrides?.to !== undefined ? overrides.to : dateTo
    if (newTo.trim()) {
      params.set('to', newTo.trim())
    } else {
      params.delete('to')
    }

    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `/khoa-hoc?${qs}` : '/khoa-hoc')
  }

  const handleApplyDates = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const buildFilterUrl = (options: { type?: string | null; category?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString())

    if ('type' in options) {
      if (options.type && options.type !== 'all') {
        params.set('type', options.type)
      } else {
        params.delete('type')
      }
    }

    if ('category' in options) {
      if (options.category && options.category !== 'all') {
        params.set('category', options.category)
      } else {
        params.delete('category')
      }
    }

    params.delete('page')
    const qs = params.toString()
    return qs ? `/khoa-hoc?${qs}` : '/khoa-hoc'
  }

  const hasActiveFilters = Boolean(
    activeCategory || activeType || activeQuery || activeStartDateFrom || activeStartDateTo,
  )

  const displayCount = allTotalCount ?? totalCount

  const isAllActive = !activeType || activeType === 'all'
  const isOfflineActive = activeType === 'OFFLINE'
  const isMoodleActive = activeType === 'MOODLE'

  return (
    <div className="flex flex-col gap-5 mb-8">
      {/* Row 1: Search input + Type/Category Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-80 md:w-96">
          <Input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onBlur={() => applyFilters({ q: search })}
            placeholder="Tìm khóa học theo tên..."
            className="h-10 bg-background text-sm rounded-lg"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tất cả (6) */}
          <Button
            asChild
            size="sm"
            variant={isAllActive ? 'default' : 'outline'}
            className={
              isAllActive
                ? 'rounded-lg font-medium px-4 h-10 shadow-xs'
                : 'rounded-lg font-medium px-4 h-10 border-border'
            }
          >
            <Link href={buildFilterUrl({ type: null, category: null })}>
              Tất cả ({displayCount})
            </Link>
          </Button>

          {/* Offline tại trung tâm */}
          <Button
            asChild
            size="sm"
            variant={isOfflineActive ? 'default' : 'outline'}
            className={
              isOfflineActive
                ? 'rounded-lg font-medium px-4 h-10 shadow-xs'
                : 'rounded-lg font-medium px-4 h-10 border-border text-foreground'
            }
          >
            <Link href={buildFilterUrl({ type: 'OFFLINE' })}>Offline tại trung tâm</Link>
          </Button>

          {/* Moodle miễn phí */}
          <Button
            asChild
            size="sm"
            variant={isMoodleActive ? 'default' : 'outline'}
            className={
              isMoodleActive
                ? 'rounded-lg font-medium px-4 h-10 shadow-xs'
                : 'rounded-lg font-medium px-4 h-10 border-border text-foreground'
            }
          >
            <Link href={buildFilterUrl({ type: 'MOODLE' })}>Moodle miễn phí</Link>
          </Button>

          {/* Categories if present */}
          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug
            return (
              <Button
                key={cat.id}
                asChild
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                className={
                  isActive
                    ? 'rounded-lg font-medium px-4 h-10 shadow-xs'
                    : 'rounded-lg font-medium px-4 h-10 border-border text-foreground'
                }
              >
                <Link href={buildFilterUrl({ category: cat.slug })}>{cat.title}</Link>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Row 2: Khai giảng Date Range + Áp dụng */}
      <form onSubmit={handleApplyDates} className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground font-semibold text-xs whitespace-nowrap">
          Khai giảng:
        </span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-muted-foreground text-xs">đến</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-9 rounded-lg font-medium px-3 text-xs"
        >
          Áp dụng
        </Button>

        {hasActiveFilters && (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-9 text-muted-foreground hover:text-foreground text-xs"
          >
            <Link href="/khoa-hoc" className="flex items-center gap-1">
              <RotateCcw className="size-3" />
              <span>Xóa bộ lọc</span>
            </Link>
          </Button>
        )}
      </form>

      {/* Row 3: Result text */}
      <div className="text-sm text-muted-foreground pt-1">
        Hiển thị <strong className="text-foreground font-bold">{totalCount}</strong> khóa học đã
        xuất bản
      </div>
    </div>
  )
}
