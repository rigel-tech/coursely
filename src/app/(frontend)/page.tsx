import type { Metadata } from 'next'

import { CourseList } from '@/components/public/CourseList'
import type { CourseSummary } from '@/components/public/CourseCard'
import { Button } from '@/components/public/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/public/ui/card'
import { Checkbox } from '@/components/public/ui/checkbox'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/public/ui/select'
import { Textarea } from '@/components/public/ui/textarea'
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

  const { hero, layout } = page

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

      {/* Các block nội dung khác */}
      <RenderBlocks blocks={layout} />

      {/* Đăng ký tư vấn & khóa học */}
      <section className="container mx-auto px-4 my-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Cột trái: giới thiệu */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-brand-accent text-sm font-semibold tracking-wide uppercase">
                Đăng ký tư vấn
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Nhận lộ trình học riêng trong 24 giờ
              </h2>
              <p className="text-muted-foreground text-base">
                Để lại thông tin, chuyên viên học vụ sẽ gọi lại, kiểm tra trình độ nói miễn phí 15
                phút và đề xuất khóa học phù hợp.
              </p>
            </div>

            <ol className="flex flex-col gap-4">
              {[
                'Kiểm tra trình độ nói miễn phí với giảng viên',
                'Nhận lộ trình & lịch lớp phù hợp giờ làm của bạn',
                'Học thử 1 buổi trước khi quyết định đăng ký',
              ].map((step, i) => (
                <li className="flex items-start gap-3" key={step}>
                  <span className="bg-brand-accent text-brand-accent-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-foreground text-sm">{step}</span>
                </li>
              ))}
            </ol>

            <p className="border-border bg-muted text-muted-foreground rounded-lg border p-4 text-sm">
              Trung tâm{' '}
              <strong className="text-foreground font-semibold">
                không thu học phí trực tuyến
              </strong>
              . Học phí được xác nhận và thanh toán tại quầy học vụ sau khi bạn chốt lớp.
            </p>
          </div>

          {/* Cột phải: form đăng ký */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Đăng ký tư vấn miễn phí</CardTitle>
              <CardDescription>
                Chúng tôi liên hệ trong giờ hành chính, thứ 2 – thứ 7.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tuvan-name">
                      Họ và tên <span className="text-destructive-foreground">*</span>
                    </Label>
                    <Input id="tuvan-name" placeholder="Nguyễn Minh Anh" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tuvan-phone">
                      Số điện thoại <span className="text-destructive-foreground">*</span>
                    </Label>
                    <Input id="tuvan-phone" placeholder="09xx xxx xxx" type="tel" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tuvan-email">
                    Email <span className="text-destructive-foreground">*</span>
                  </Label>
                  <Input id="tuvan-email" placeholder="minhanh@congty.vn" type="email" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tuvan-course">Khóa học quan tâm</Label>
                    <Select>
                      <SelectTrigger id="tuvan-course">
                        <SelectValue placeholder="Chọn khóa học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="giao-tiep">Giao tiếp cho người đi làm</SelectItem>
                        <SelectItem value="ielts-speaking">IELTS Speaking 6.5+</SelectItem>
                        <SelectItem value="cong-so">Tiếng Anh công sở</SelectItem>
                        <SelectItem value="khac">Khác / chưa rõ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="tuvan-time">Thời gian học mong muốn</Label>
                    <Select>
                      <SelectTrigger id="tuvan-time">
                        <SelectValue placeholder="Chọn thời gian" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toi-trong-tuan">Tối các ngày trong tuần</SelectItem>
                        <SelectItem value="cuoi-tuan">Cuối tuần</SelectItem>
                        <SelectItem value="gio-hanh-chinh">Giờ hành chính</SelectItem>
                        <SelectItem value="linh-hoat">Linh hoạt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tuvan-goal">Mục tiêu của bạn</Label>
                  <Textarea
                    id="tuvan-goal"
                    placeholder="Ví dụ: cần tự tin họp với đối tác nước ngoài trong 3 tháng tới"
                    rows={3}
                  />
                </div>

                <div className="flex items-start gap-2.5">
                  <Checkbox className="mt-0.5" id="tuvan-consent" />
                  <Label
                    className="text-muted-foreground text-xs font-normal leading-relaxed"
                    htmlFor="tuvan-consent"
                  >
                    Tôi đồng ý để Coursely liên hệ tư vấn và xử lý thông tin của tôi theo Chính sách
                    bảo mật.
                  </Label>
                </div>

                <Button className="w-full" type="submit">
                  Gửi thông tin đăng ký
                </Button>

                <p className="text-muted-foreground text-center text-xs">
                  Hoặc gọi ngay <span className="text-foreground font-semibold">1900 6789</span> để
                  được tư vấn trực tiếp
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
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
        equals: 'home',
      },
    },
  })

  return result.docs?.[0] || null
})
