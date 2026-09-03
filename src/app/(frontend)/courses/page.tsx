import type { Metadata } from 'next/types'

import { CourseList } from '@/components/design/blocks/course-list'
import type { CourseSummary } from '@/components/design/blocks/course-card'
import { PageRange } from '@/components/public/PageRange'
import { Pagination } from '@/components/public/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function CoursesPage() {
  const payload = await getPayload({ config: configPromise })

  const coursesRes = await payload.find({
    collection: 'courses',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    where: {
      _status: {
        equals: 'published',
      },
    },
  })

  const courses: CourseSummary[] = coursesRes.docs.map((course) => {
    const img = typeof course.image === 'object' && course.image !== null ? course.image : null
    const metaImg =
      typeof course.meta?.image === 'object' && course.meta?.image !== null
        ? course.meta.image
        : null
    const imgUrl = img?.url || metaImg?.url || null

    return {
      id: course.id,
      title: course.title,
      excerpt: course.shortDescription || course.meta?.description || undefined,
      duration: course.duration || undefined,
      level: 'beginner',
      imageUrl: imgUrl,
      href: `/courses/${course.slug}`,
    }
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-8">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Danh sách khóa học
          </h1>
          <p className="text-muted-foreground text-lg">
            Khám phá các khóa học chất lượng cao, từ cơ bản đến nâng cao.
          </p>
        </div>
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
          emptyTitle="Chưa có khóa học nào"
          emptyDescription="Các khóa học mới sẽ được cập nhật sớm nhất."
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
