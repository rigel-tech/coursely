'use client'

import { Search, X, RotateCcw } from 'lucide-react'
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
  totalCount?: number
}

/**
 * Course search and category filter controls (US-103).
 */
export function CourseFilters({
  categories,
  activeCategory,
  activeQuery = '',
  totalCount,
}: CourseFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(activeQuery)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (search.trim()) {
      params.set('q', search.trim())
    } else {
      params.delete('q')
    }
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `/courses?${qs}` : '/courses')
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

  const hasActiveFilters = Boolean(activeCategory || activeQuery)

  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Ô tìm kiếm theo tên khóa học */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm khóa học theo tên..."
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                const params = new URLSearchParams(searchParams.toString())
                params.delete('q')
                const qs = params.toString()
                router.push(qs ? `/courses?${qs}` : '/courses')
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button type="submit" variant="default">
          Tìm kiếm
        </Button>
      </form>

      {/* Danh mục & Nút xóa bộ lọc */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            variant={!activeCategory || activeCategory === 'all' ? 'default' : 'outline'}
            className="rounded-full"
          >
            <Link href={buildCategoryUrl(null)}>Tất cả</Link>
          </Button>

          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug
            return (
              <Button
                key={cat.id}
                asChild
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                className="rounded-full"
              >
                <Link href={buildCategoryUrl(cat.slug)}>{cat.title}</Link>
              </Button>
            )
          })}
        </div>

        {hasActiveFilters && (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/courses" className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5" />
              <span>Xóa bộ lọc</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Số lượng kết quả tìm thấy */}
      {typeof totalCount === 'number' && (
        <div className="text-sm text-muted-foreground">
          {hasActiveFilters ? (
            <span>
              Tìm thấy <strong className="text-foreground font-semibold">{totalCount}</strong> khóa
              học phù hợp
            </span>
          ) : (
            <span>
              Tổng số <strong className="text-foreground font-semibold">{totalCount}</strong> khóa
              học
            </span>
          )}
        </div>
      )}
    </div>
  )
}
