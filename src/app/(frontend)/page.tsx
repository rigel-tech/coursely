import type { Metadata } from 'next'

import { CourseList } from '@/components/public/CourseList'
import type { CourseSummary } from '@/components/public/CourseCard'
import { Button } from '@/components/public/ui/button'
import { PayloadRedirects } from '@/components/public/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './[...slug]/page.client'
import { LivePreviewListener } from '@/components/public/LivePreviewListener'
import { ArrowRight } from 'lucide-react'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function HomePage() {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  let page: RequiredDataFromCollectionSlug<'pages'> | null = null

  page = await queryHomePage()

  // Lấy các khóa học nổi bật hiển thị trên Trang Chủ
  const coursesRes = await payload.find({
    collection: 'courses',
    depth: 1,
    limit: 6,
    overrideAccess: true,
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
      href: `/khoa-hoc/${course.slug}`,
    }
  })

  const hero = page?.hero || { type: 'none' }
  const layout = page?.layout || []

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      <PayloadRedirects disableNotFound url="/" />
      {draft && <LivePreviewListener />}

      {/* Hero Banner */}
      <RenderHero {...hero} />

      {/* Khối hiển thị các khóa học nổi bật trên Trang Chủ */}
      <section className="container mx-auto px-4 my-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Các khóa học nổi bật
            </h2>
            <p className="text-muted-foreground mt-2 text-base">
              Nâng cao kỹ năng với các khóa học chất lượng cao, linh hoạt trực tuyến & trực tiếp.
            </p>
          </div>
          {courses.length > 0 && (
            <Button asChild variant="outline" className="self-start sm:self-auto">
              <Link href="/khoa-hoc" className="inline-flex items-center gap-1.5 font-medium">
                Xem tất cả khóa học
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>

        <CourseList
          courses={courses}
          emptyTitle="Chưa có khóa học nào"
          emptyDescription="Hãy vào trang Admin để tạo khóa học đầu tiên của bạn!"
        />
      </section>

      {/* Các block nội dung động từ Admin */}
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await queryHomePage()
  return generateMeta({ doc: page })
}

const queryHomePage = cache(async () => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: {
      slug: {
        equals: '/',
      },
    },
  })

  return result.docs?.[0] || null
})
