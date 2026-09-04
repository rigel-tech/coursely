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
  categories: Category[]
  activeCategory?: string
  activeQuery?: string
  activeStartDateFrom?: string
  activeStartDateTo?: string
  totalCount?: number
  allTotalCount?: number
}

/**
 * Course search, category and date filter controls (US-103 matching UI design).
 */
export function CourseFilters({
  categories,
  activeCategory,
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
    router.push(qs ? `/courses?${qs}` : '/courses')
  }

  const handleApplyDates = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const buildCategoryUrl = (slug?: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (slug && slug !== 'all') {
      params.set('category', slug)
    } else {
      params.delete('category')
    }
    params.delete('page')
    const qs = params.toString()
    return qs ? `/courses?${qs}` : '/courses'
  }

  const hasActiveFilters = Boolean(
    activeCategory || activeQuery || activeStartDateFrom || activeStartDateTo,
  )

  const displayCount = allTotalCount ?? totalCount

  return (
    <div className="flex flex-col gap-5 mb-8">
      {/* Row 1: Search input + Category Pills */}
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
          <Button
            asChild
            size="sm"
            variant={!activeCategory || activeCategory === 'all' ? 'default' : 'outline'}
            className={
              !activeCategory || activeCategory === 'all'
                ? 'rounded-lg font-medium px-4 h-10 shadow-xs'
                : 'rounded-lg font-medium px-4 h-10 border-border'
            }
          >
            <Link href={buildCategoryUrl(null)}>Tất cả ({displayCount})</Link>
          </Button>

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
                <Link href={buildCategoryUrl(cat.slug)}>{cat.title}</Link>
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
            <Link href="/courses" className="flex items-center gap-1">
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
