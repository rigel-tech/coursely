'use client'

import {
  AlertCircle,
  BookOpen,
  Camera,
  CheckCircle2,
  GraduationCap,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import Link from 'next/link'
import React, { useActionState, useId, useRef, useState } from 'react'

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
import { updateProfileAction, type ProfileFormState } from '@/actions/student/profile'
import type { User, Media } from '@/payload-types'

const initialState: ProfileFormState = {
  status: 'idle',
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

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState)
  const formId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [courseTab, setCourseTab] = useState<CourseTab>('all')

  const initialAvatarUrl =
    typeof user.avatar === 'object' && user.avatar !== null
      ? (user.avatar as Media).url || null
      : null

  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setAvatarPreview(previewUrl)
    }
  }

  const statusInfo = STATUS_LABELS[user.status || 'ACTIVE'] || {
    label: user.status || 'Hoạt động',
    variant: 'outline' as const,
  }

  /** No enrollment data source yet — every tab renders the same empty list. */
  const courses: never[] = []

  return (
    <div className="flex flex-col gap-8">
      {/* Banner: full-bleed như header, nội dung căn theo container bên trong */}
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
                form={formId}
                type="file"
                name="avatar"
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
        {/* Cột trái: thông tin cá nhân + tổng quan học tập */}
        <div className="flex flex-col gap-8 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-accent text-xl font-bold">
                Thông tin cá nhân
              </CardTitle>
            </CardHeader>

            <CardContent>
              {state.status === 'success' && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-success bg-success/15 p-4 text-success-foreground text-sm">
                  <CheckCircle2 className="size-5 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              {state.status === 'error' && state.message && (
                <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive bg-destructive/15 p-4 text-destructive-foreground text-sm">
                  <AlertCircle className="size-5 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              {isEditing ? (
                <form
                  id={formId}
                  action={formAction}
                  className="space-y-5"
                  onSubmit={() => setIsEditing(false)}
                >
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
                      name="fullName"
                      type="text"
                      defaultValue={user.fullName || ''}
                      placeholder="Nhập họ và tên đầy đủ"
                      maxLength={255}
                      aria-invalid={!!state.fieldErrors?.fullName}
                    />
                    {state.fieldErrors?.fullName && (
                      <p className="text-destructive text-sm font-medium">
                        {state.fieldErrors.fullName}
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
                      name="phone"
                      type="tel"
                      defaultValue={user.phone || ''}
                      placeholder="Ví dụ: 0912345678"
                      maxLength={30}
                      aria-invalid={!!state.fieldErrors?.phone}
                    />
                    {state.fieldErrors?.phone && (
                      <p className="text-destructive text-sm font-medium">
                        {state.fieldErrors.phone}
                      </p>
                    )}
                  </div>
                  {state.fieldErrors?.avatar && (
                    <p className="text-destructive text-sm font-medium">
                      {state.fieldErrors.avatar}
                    </p>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={isPending} className="flex-1">
                      {isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => {
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
                <span className="font-semibold text-foreground">0</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Đang học</span>
                <span className="font-semibold text-foreground">0</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Chờ xác nhận</span>
                <span className="font-semibold text-foreground">0</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: khóa học của tôi */}
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
                    {tab.key === 'all' && ` (${courses.length})`}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              {courses.length === 0 ? (
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
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
