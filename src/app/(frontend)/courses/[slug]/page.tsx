import type { Metadata } from 'next'

import { Badge } from '@/components/public/ui/badge'
import { Button } from '@/components/public/ui/button'
import { PayloadRedirects } from '@/components/public/PayloadRedirects'
import RichText from '@/components/public/RichText'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import React, { cache } from 'react'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
} from 'lucide-react'
import PageClient from './page.client'
import { CourseRegistrationCTA } from '@/components/public/CourseRegistrationCTA'
import { LivePreviewListener } from '@/components/public/LivePreviewListener'
import { getSessionStudent } from '@/lib/auth/session-student'
import { getActiveEnrollmentStatus } from '@/services/student-enrollment'
import { COURSE_TYPE_LABEL } from '@/components/public/course-type-label'
import type { Course, CourseObjective, CoursePhase } from '@/payload-types'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const courses = await payload.find({
    collection: 'courses',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return courses.docs.map(({ slug }) => ({ slug }))
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function CourseDetailPage({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const url = '/courses/' + decodedSlug

  const course = await queryCourseBySlug({ slug: decodedSlug })

  if (!course) {
    return <PayloadRedirects url={url} />
  }

  const payload = await getPayload({ config: configPromise })
  const student = await getSessionStudent()
  const enrollmentStatus = student
    ? await getActiveEnrollmentStatus(payload, { studentId: student.id, courseId: course.id })
    : undefined

  // Lấy danh sách mục tiêu khóa học (Course Objectives)
  const objectivesRes = await payload.find({
    collection: 'course-objectives',
    limit: 100,
    overrideAccess: draft,
    pagination: false,
    sort: 'sortOrder',
    where: {
      course: {
        equals: course.id,
      },
    },
  })
  const objectives = objectivesRes.docs as CourseObjective[]

  // Lấy lộ trình các giai đoạn học tập (Course Phases)
  const phasesRes = await payload.find({
    collection: 'course-phases',
    limit: 100,
    overrideAccess: draft,
    pagination: false,
    sort: 'sortOrder',
    where: {
      course: {
        equals: course.id,
      },
    },
  })
  const phases = phasesRes.docs as CoursePhase[]

  const img = typeof course.image === 'object' && course.image !== null ? course.image : null
  const metaImg =
    typeof course.meta?.image === 'object' && course.meta?.image !== null ? course.meta.image : null
  const imageUrl = img?.url || metaImg?.url || null

  const isMoodle = course.courseType === 'MOODLE'

  return (
    <article className="pt-16 pb-24">
      <PageClient />
      <PayloadRedirects disableNotFound url={url} />
      {draft && <LivePreviewListener />}

      {/* Hero Header */}
      <section className="border-border/40 bg-muted/30 border-b py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              className="text-muted-foreground hover:text-foreground transition-colors"
              href="/"
            >
              Trang chủ
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <Link
              className="text-muted-foreground hover:text-foreground transition-colors"
              href="/khoa-hoc"
            >
              Khóa học
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground font-medium">{course.title}</span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isMoodle ? 'brand' : 'default'}>
                  {isMoodle ? 'Khóa học Moodle' : 'Khóa học Offline'}
                </Badge>
                {course.duration && (
                  <Badge variant="outline">
                    <Clock className="mr-1.5 size-3.5" />
                    {course.duration}
                  </Badge>
                )}
              </div>

              <h1 className="text-foreground mt-4 text-3xl font-bold tracking-tight">
                {course.title}
              </h1>

              {course.shortDescription && (
                <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
                  {course.shortDescription}
                </p>
              )}
            </div>

            {imageUrl && (
              <div className="lg:col-span-4">
                <div className="aspect-video overflow-hidden rounded-lg border shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={course.title} className="size-full object-cover" src={imageUrl} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Body Grid */}
      <div className="container mx-auto mt-12 px-4">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Main Column */}
          <div className="space-y-12 lg:col-span-8">
            {/* Giới thiệu chi tiết */}
            {course.description && (
              <section className="border-border/40 rounded-lg border bg-card p-6 sm:p-8">
                <h2 className="text-foreground flex items-center gap-2 text-2xl font-bold">
                  <BookOpen className="text-primary size-6" />
                  Giới thiệu khóa học
                </h2>
                <div className="mt-6">
                  <RichText data={course.description} enableGutter={false} />
                </div>
              </section>
            )}

            {/* Mục tiêu đầu ra (Objectives) */}
            {objectives.length > 0 && (
              <section className="border-border/40 rounded-lg border bg-card p-6 sm:p-8">
                <h2 className="text-foreground flex items-center gap-2 text-2xl font-bold">
                  <CheckCircle2 className="text-primary size-6" />
                  Mục tiêu đầu ra của khóa học
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {objectives.map((obj) => (
                    <div
                      className="border-border/40 bg-muted/40 flex items-start gap-3 rounded-lg border p-4"
                      key={obj.id}
                    >
                      <CheckCircle2 className="text-primary mt-0.5 size-5 shrink-0" />
                      <div>
                        <h3 className="text-foreground font-semibold text-base">{obj.title}</h3>
                        {obj.description && (
                          <p className="text-muted-foreground mt-1 text-sm">{obj.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Lộ trình học tập (Phases) */}
            {phases.length > 0 && (
              <section className="border-border/40 rounded-lg border bg-card p-6 sm:p-8">
                <h2 className="text-foreground flex items-center gap-2 text-2xl font-bold">
                  <Layers className="text-primary size-6" />
                  Lộ trình học tập chi tiết
                </h2>
                <div className="mt-6 space-y-4">
                  {phases.map((phase, idx) => (
                    <div
                      className="border-border/40 bg-muted/20 relative overflow-hidden rounded-lg border p-5 pl-6"
                      key={phase.id}
                    >
                      <div className="text-primary/10 absolute -right-2 -top-2 text-3xl font-black select-none">
                        0{idx + 1}
                      </div>
                      <div className="relative">
                        <span className="text-primary text-xs font-semibold uppercase tracking-wider">
                          Giai đoạn 0{idx + 1}
                        </span>
                        <h3 className="text-foreground mt-1 text-lg font-bold">{phase.title}</h3>
                        {phase.description && (
                          <div className="mt-3 text-sm">
                            <RichText data={phase.description} enableGutter={false} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar CTA Card */}
          <div className="lg:col-span-4">
            <div className="border-border/60 sticky top-24 rounded-lg border bg-card p-6 shadow-md">
              <h3 className="text-foreground text-xl font-bold">Thông tin đăng ký</h3>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="size-4" /> Hình thức:
                  </span>
                  <span className="text-foreground font-semibold">
                    {COURSE_TYPE_LABEL[course.courseType]}
                  </span>
                </div>

                {course.duration && (
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="size-4" /> Thời lượng:
                    </span>
                    <span className="text-foreground font-semibold">{course.duration}</span>
                  </div>
                )}

                {course.registrationStartAt && (
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="size-4" /> Mở đăng ký:
                    </span>
                    <span className="text-foreground font-semibold">
                      {new Date(course.registrationStartAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}

                {course.registrationEndAt && (
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="size-4" /> Hạn chót:
                    </span>
                    <span className="font-semibold text-destructive-foreground">
                      {new Date(course.registrationEndAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-8">
                {isMoodle && course.moodleUrl ? (
                  <Button asChild className="w-full text-base py-6 font-semibold" size="lg">
                    <a href={course.moodleUrl} rel="noopener noreferrer" target="_blank">
                      Vào học trên Moodle
                      <ExternalLink className="ml-2 size-4" />
                    </a>
                  </Button>
                ) : (
                  <CourseRegistrationCTA
                    course={{ id: course.id, title: course.title }}
                    enrollmentStatus={enrollmentStatus}
                    profile={
                      student
                        ? { email: student.email, fullName: student.fullName, phone: student.phone }
                        : undefined
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const course = await queryCourseBySlug({ slug: decodedSlug })

  if (!course) {
    return {
      title: 'Khóa học không tồn tại | Coursely',
    }
  }

  const title = course.meta?.title || `${course.title} | Coursely`
  const description = course.meta?.description || course.shortDescription || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  }
}

const queryCourseBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'courses',
    depth: 1,
    draft,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
      ...(draft ? {} : { _status: { equals: 'published' } }),
    },
  })

  return (result.docs?.[0] as Course) || null
})
