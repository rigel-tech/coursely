import type { Metadata } from 'next/types'
import Link from 'next/link'
import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { CourseList } from '@/components/public/CourseList'
import type { CourseSummary } from '@/components/public/CourseCard'
import { CourseFilters } from '@/components/public/CourseFilters'
import { Button } from '@/components/public/ui/button'
import { PageRange } from '@/components/public/PageRange'
import { Pagination } from '@/components/public/Pagination'
import { buildCourseWhereQuery } from '@/lib/course/build-filter-query'
import type { Category, Course, Media } from '@/payload-types'
import PageClient from './page.client'

export const dynamic = 'force-dynamic'

interface CoursesPageProps {
  searchParams: Promise<{
    category?: string
    q?: string
    from?: string
    to?: string
    page?: string
  }>
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const { category, q, from, to, page } = await searchParams
  const pageNumber = page ? parseInt(page, 10) : 1
  const payload = await getPayload({ config: configPromise })

  // 1. Lấy danh sách tất cả các danh mục để hiển thị trên thanh lọc
  const categoriesRes = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 50,
    sort: 'title',
  })

  // 2. Lấy tổng số lượng tất cả khóa học published (cho nút "Tất cả")
  const allCoursesRes = await payload.find({
    collection: 'courses',
    depth: 0,
    limit: 1,
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  // 3. Xây dựng câu query lọc theo danh mục, từ khóa tìm kiếm & khoảng thời gian
  const where = buildCourseWhereQuery({
    categorySlug: category,
    query: q,
    startDateFrom: from,
    startDateTo: to,
  })

  // 4. Truy vấn danh sách khóa học (chỉ lấy published, không bao giờ lấy Class)
  const coursesRes = await payload.find({
    collection: 'courses',
    depth: 1,
    limit: 12,
    page: pageNumber,
    overrideAccess: false,
    where,
  })

  const hasActiveFilters = Boolean(category || q || from || to)

  const courses: CourseSummary[] = coursesRes.docs.map((course: Course) => {
    const img =
      typeof course.image === 'object' && course.image !== null ? (course.image as Media) : null
    const metaImg =
      typeof course.meta?.image === 'object' && course.meta?.image !== null
        ? (course.meta.image as Media)
        : null
    const imgUrl = img?.url || metaImg?.url || null

    const categoryObj =
      typeof course.category === 'object' && course.category !== null
        ? (course.category as Category)
        : null

    const tags = Array.isArray(course.tags) ? course.tags.map((t) => t.tag) : []

    return {
      id: course.id,
      title: course.title,
      excerpt: course.shortDescription || course.meta?.description || undefined,
      duration: course.duration || undefined,
      level: 'beginner',
      categoryName: categoryObj?.title || undefined,
      tags,
      imageUrl: imgUrl,
      href: `/courses/${course.slug}`,
    }
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-8">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Danh sách khóa học</h1>
          <p className="text-muted-foreground text-lg">
            Khám phá các khóa học chất lượng cao, từ cơ bản đến nâng cao.
          </p>
        </div>
      </div>

      <div className="container">
        {/* Bộ lọc theo danh mục & tìm kiếm theo tên khóa học */}
        <CourseFilters
          categories={categoriesRes.docs}
          activeCategory={category}
          activeQuery={q}
          activeStartDateFrom={from}
          activeStartDateTo={to}
          totalCount={coursesRes.totalDocs}
          allTotalCount={allCoursesRes.totalDocs}
        />
      </div>

      <div className="container mb-8">
        <PageRange
          collectionLabels={{
            singular: 'Khóa học',
            plural: 'Khóa học',
          }}
          currentPage={coursesRes.page}
          limit={12}
          totalDocs={coursesRes.totalDocs}
        />
      </div>

      <div className="container mb-12">
        <CourseList
          courses={courses}
          emptyTitle={
            hasActiveFilters ? 'Không tìm thấy khóa học nào phù hợp' : 'Chưa có khóa học nào'
          }
          emptyDescription={
            hasActiveFilters
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.'
              : 'Các khóa học mới sẽ được cập nhật sớm nhất.'
          }
          emptyAction={
            hasActiveFilters ? (
              <Button asChild variant="outline">
                <Link href="/courses">Xóa bộ lọc</Link>
              </Button>
            ) : undefined
          }
        />
      </div>

      <div className="container">
        {coursesRes.totalPages > 1 && coursesRes.page && (
          <Pagination page={coursesRes.page} totalPages={coursesRes.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Danh sách khóa học | Coursely`,
    description: `Tổng hợp tất cả các khóa học đào tạo trực tuyến và trực tiếp.`,
  }
}
