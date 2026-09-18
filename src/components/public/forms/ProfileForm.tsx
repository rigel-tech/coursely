'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  BookOpen,
  Camera,
  CheckCircle2,
  GraduationCap,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  School,
  User as UserIcon,
} from 'lucide-react'
import Link from 'next/link'
import { type ChangeEvent, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Avatar } from '@/components/public/ui/avatar'
import { Badge } from '@/components/public/ui/badge'
import { Button } from '@/components/public/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/public/ui/card'
import { EmptyState } from '@/components/public/ui/empty-state'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { LogoutCta } from '@/components/public/LogoutCta'
import { updateProfileAction } from '@/actions/student/profile'
import { initialProfileState, type ProfileState } from '@/lib/constants/profile-state'
import { profileSchema, type ProfileValues } from '@/lib/validation/profile-schema'
import type { Student, Media, Enrollment } from '@/payload-types'
import { ENROLLMENT_STATUS } from '@/components/public/enrollment-status'

const SYSTEM_FAILURE: ProfileState = {
  status: 'error',
  message: 'Có lỗi hệ thống. Vui lòng thử lại sau.',
}

const STATUS_LABELS: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'error' | 'outline' }
> = {
  ACTIVE: { label: 'Đang hoạt động', variant: 'success' },
  PENDING_VERIFICATION: { label: 'Chờ xác thực', variant: 'warning' },
  DISABLED: { label: 'Đã khóa', variant: 'error' },
}

/** `Khóa học của tôi` has no enrollment data source yet — every tab renders empty. */
const COURSE_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'in-progress', label: 'Đang học' },
  { key: 'completed', label: 'Hoàn thành' },
] as const

type CourseTab = (typeof COURSE_TABS)[number]['key']

// Mapping nhãn tiếng Việt cho trạng thái học phí
export const PAYMENT_STATUS_LABELS: Record<
  Enrollment['paymentStatus'],
  { label: string; variant: 'success' | 'warning' | 'error' | 'outline' | 'default' | 'brand' }
> = {
  UNPAID: { label: 'Chưa thanh toán', variant: 'warning' },
  PARTIALLY_PAID: { label: 'Thanh toán một phần', variant: 'brand' },
  PAID: { label: 'Đã thanh toán', variant: 'success' },
  CANCELLED: { label: 'Đã hủy / Hoàn tiền', variant: 'error' },
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface ProfileFormProps {
  user: Student
  enrollments?: Enrollment[]
}
/**
 * The student's own profile: read-only view plus an edit form for `fullName`, `phone`
 * and `avatar`. `react-hook-form` validates the text fields against the same
 * `profileSchema` the action re-checks server-side, then builds a `FormData` to call
 * `updateProfileAction` directly — `avatar` is a `File`, and `FormData` is the
 * documented way a Next.js Server Action receives one.
 *
 * Edit mode only closes on a confirmed `'success'`: a failed save leaves the form open,
 * with the banner and the person's typed values both still there, instead of bouncing
 * them back to the read-only view before they can see what went wrong.
 */
export function ProfileForm({ user, enrollments = [] }: ProfileFormProps) {
  const [state, setState] = useState<ProfileState>(initialProfileState)
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [courseTab, setCourseTab] = useState<CourseTab>('all')

  const initialAvatarUrl =
    typeof user.avatar === 'object' && user.avatar !== null
      ? (user.avatar as Media).url || null
      : null
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName ?? '', phone: user.phone ?? '' },
  })

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const onSubmit = async (values: ProfileValues) => {
    const formData = new FormData()
    formData.set('fullName', values.fullName)
    formData.set('phone', values.phone)
    if (avatarFile) formData.set('avatar', avatarFile)

    const result = await updateProfileAction(formData).catch(() => SYSTEM_FAILURE)
    setState(result)
    if (result.status === 'success') setIsEditing(false)
  }

  const statusInfo = STATUS_LABELS[user.status || 'ACTIVE'] || {
    label: user.status || 'Hoạt động',
    variant: 'outline' as const,
  }

  const completedCount = enrollments.filter((e) => e.enrollmentStatus === 'COMPLETED').length
  const inProgressCount = enrollments.filter(
    (e) => e.enrollmentStatus === 'ATTENDED' || e.enrollmentStatus === 'CONFIRMED',
  ).length
  const pendingCount = enrollments.filter((e) => e.enrollmentStatus === 'NEW').length

  const filteredEnrollments = enrollments.filter((e) => {
    if (courseTab === 'in-progress') {
      return (
        e.enrollmentStatus === 'ATTENDED' ||
        e.enrollmentStatus === 'CONFIRMED' ||
        e.enrollmentStatus === 'NEW'
      )
    }
    if (courseTab === 'completed') {
      return e.enrollmentStatus === 'COMPLETED'
    }
    return true
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-hero-accent">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div
              className="relative group"
              onClick={() => isEditing && fileInputRef.current?.click()}
            >
              <Avatar
                className="size-20 border-2 border-primary-foreground/30 shadow-sm sm:size-24"
                name={user.fullName || user.email}
                src={avatarPreview}
              />
              {isEditing && (
                <div className="absolute inset-0 bg-foreground/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="text-primary-foreground size-6" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
                {user.fullName || 'Học viên'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary-foreground/80">
                <span>{user.email}</span>
                {user.phone && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{user.phone}</span>
                  </>
                )}
                {user.verifiedAt && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-success" />
                      Đã xác minh email
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button asChild variant="brand">
              <Link href="/khoa-hoc">Đăng ký khóa mới</Link>
            </Button>
            <LogoutCta
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-accent text-xl font-bold">
                Thông tin cá nhân
              </CardTitle>
            </CardHeader>

            <CardContent>
              {state.status === 'success' && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-success-foreground/30 bg-success/15 p-4 text-success-foreground text-sm">
                  <CheckCircle2 className="size-5 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              {state.status === 'error' && state.message && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive-foreground/30 bg-destructive/15 p-4 text-destructive-foreground text-sm">
                  <AlertCircle className="size-5 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              {isEditing ? (
                <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="text-foreground font-medium flex items-center gap-1.5"
                    >
                      <UserIcon className="size-4 text-muted-foreground" />
                      Họ và tên
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Nhập họ và tên đầy đủ"
                      maxLength={255}
                      aria-invalid={Boolean(errors.fullName)}
                      {...register('fullName')}
                    />
                    {errors.fullName && (
                      <p className="text-destructive-foreground text-xs font-medium">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="text-foreground font-medium flex items-center gap-1.5"
                    >
                      <Phone className="size-4 text-muted-foreground" />
                      Số điện thoại
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Ví dụ: 0912345678"
                      maxLength={30}
                      aria-invalid={Boolean(errors.phone)}
                      {...register('phone')}
                    />
                    {errors.phone && (
                      <p className="text-destructive-foreground text-xs font-medium">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => {
                        setAvatarFile(null)
                        setAvatarPreview(initialAvatarUrl)
                        setIsEditing(false)
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Họ và tên
                    </p>
                    <p className="font-medium text-foreground">{user.fullName || 'Học viên'}</p>
                  </div>

                  <div className="space-y-1 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email đăng nhập
                    </p>
                    <p className="font-medium text-foreground">{user.email}</p>
                    <p className="text-muted-foreground-subtle text-xs">Không thể thay đổi</p>
                  </div>

                  <div className="space-y-1 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Số điện thoại
                    </p>
                    <p className="font-medium text-foreground">{user.phone || '—'}</p>
                  </div>

                  <div className="space-y-1 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Trạng thái tài khoản
                    </p>
                    <Badge variant={statusInfo.variant}>
                      <ShieldCheck className="mr-1 size-3.5" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <Button className="w-full" onClick={() => setIsEditing(true)}>
                    Chỉnh sửa thông tin
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-heading-accent text-xl font-bold">
                Tổng quan học tập
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Khóa đã hoàn thành</span>
                <span className="font-semibold text-foreground">{completedCount}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Đang học</span>
                <span className="font-semibold text-foreground">{inProgressCount}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Chờ xác nhận</span>
                <span className="font-semibold text-foreground">{pendingCount}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-heading-accent text-xl font-bold">
                  Khóa học của tôi
                </CardTitle>
                <CardDescription>Danh sách khóa học bạn đã đăng ký tại Coursely.</CardDescription>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {COURSE_TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    type="button"
                    size="sm"
                    variant={courseTab === tab.key ? 'default' : 'outline'}
                    onClick={() => setCourseTab(tab.key)}
                  >
                    {tab.label}
                    {tab.key === 'all' &&
                      (enrollments.length > 0 ? ` (${enrollments.length})` : '')}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              {filteredEnrollments.length === 0 ? (
                <EmptyState
                  icon={courseTab === 'completed' ? GraduationCap : BookOpen}
                  title="Chưa có khóa học nào"
                  description="Bạn chưa đăng ký khóa học nào tại Coursely. Khám phá các khóa học đang mở lớp để bắt đầu hành trình học tập."
                  action={
                    <Button asChild>
                      <Link href="/khoa-hoc">Khám phá khóa học</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {filteredEnrollments.map((enrollment) => {
                    const course = typeof enrollment.course === 'object' ? enrollment.course : null
                    if (!course) return null

                    const enrollmentStatusInfo = ENROLLMENT_STATUS[enrollment.enrollmentStatus] || {
                      label: enrollment.enrollmentStatus,
                      variant: 'outline' as const,
                    }
                    const paymentStatusInfo = PAYMENT_STATUS_LABELS[enrollment.paymentStatus] || {
                      label: enrollment.paymentStatus,
                      variant: 'outline' as const,
                    }

                    const formattedDate = formatDate(
                      enrollment.registeredAt || enrollment.createdAt,
                    )
                    const assignedClass =
                      typeof enrollment.class === 'object' && enrollment.class !== null
                        ? enrollment.class
                        : null

                    return (
                      <div
                        key={enrollment.id}
                        className="flex flex-col gap-4 rounded-lg border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-border"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <Link
                              href={`/khoa-hoc/${course.slug}`}
                              className="text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                            >
                              {course.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Ngày đăng ký:{' '}
                                <strong className="text-foreground font-medium">
                                  {formattedDate}
                                </strong>
                              </span>
                              {course.duration && (
                                <span>
                                  Thời lượng:{' '}
                                  <strong className="text-foreground font-medium">
                                    {course.duration}
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:self-center">
                            <Badge variant={enrollmentStatusInfo.variant}>
                              {enrollmentStatusInfo.label}
                            </Badge>
                            <Badge variant={paymentStatusInfo.variant}>
                              {paymentStatusInfo.label}
                            </Badge>
                          </div>
                        </div>

                        {assignedClass ? (
                          <div className="rounded-md border border-border/80 bg-muted/30 p-3.5 sm:p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5 mb-3">
                              <div className="flex items-center gap-2">
                                <School className="size-4 text-primary" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Lớp học:
                                </span>
                                <span className="font-semibold text-foreground text-sm font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  {assignedClass.code}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Đã xếp lớp
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                                <span>
                                  Thời gian:{' '}
                                  <strong className="text-foreground font-medium">
                                    {formatDate(assignedClass.startDate)}
                                    {assignedClass.endDate
                                      ? ` – ${formatDate(assignedClass.endDate)}`
                                      : ''}
                                  </strong>
                                </span>
                              </div>

                              {assignedClass.scheduleTime && (
                                <div className="flex items-center gap-2">
                                  <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                                  <span>
                                    Khung giờ:{' '}
                                    <strong className="text-foreground font-medium">
                                      {assignedClass.scheduleTime}
                                    </strong>
                                  </span>
                                </div>
                              )}

                              {assignedClass.location && (
                                <div className="flex items-center gap-2 sm:col-span-2">
                                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                                  <span>
                                    Địa điểm:{' '}
                                    <strong className="text-foreground font-medium">
                                      {assignedClass.location}
                                    </strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border/70 bg-muted/15 px-3.5 py-2.5 text-xs">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <School className="size-4 text-muted-foreground/70" />
                              <span>Thông tin lớp học:</span>
                              <Badge
                                variant="outline"
                                className="text-xs font-normal text-muted-foreground"
                              >
                                Chưa xếp lớp
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground/80 hidden sm:inline">
                              Coursely sẽ thông báo khi có lịch xếp lớp
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
