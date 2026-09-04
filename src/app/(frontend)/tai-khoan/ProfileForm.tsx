'use client'

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import React, { useActionState, useRef, useState } from 'react'

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

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Cột trái: Tóm tắt thông tin tài khoản */}
      <div className="lg:col-span-4">
        <Card>
          <CardHeader className="text-center flex flex-col items-center pb-2">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar
                className="size-24 border-2 border-border shadow-sm"
                name={user.fullName || user.email}
                src={avatarPreview}
              />
              <div className="absolute inset-0 bg-foreground/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-primary-foreground size-6" />
              </div>
            </div>

            <CardTitle className="mt-4 text-xl font-bold text-foreground">
              {user.fullName || 'Học viên'}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {user.email}
            </CardDescription>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge variant={statusInfo.variant}>
                <ShieldCheck className="mr-1 size-3.5" />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline">
                {user.role === 'ADMIN' ? 'Quản trị viên' : 'Học viên'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 border-t border-border mt-4 space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="flex items-center justify-between">
                <span>Ngày tham gia:</span>
                <span className="font-medium text-foreground">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
              </p>
              {user.verifiedAt && (
                <p className="flex items-center justify-between">
                  <span>Xác thực email lúc:</span>
                  <span className="font-medium text-foreground">
                    {new Date(user.verifiedAt).toLocaleDateString('vi-VN')}
                  </span>
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-border">
              <LogoutCta
                variant="outline"
                size="default"
                showIcon
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cột phải: Form chỉnh sửa thông tin */}
      <div className="lg:col-span-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">Thông tin cá nhân</CardTitle>
            <CardDescription>
              Quản lý và cập nhật thông tin tài khoản của bạn trên Coursely.
            </CardDescription>
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

            <form action={formAction} className="space-y-6">
              {/* Input tệp ảnh đại diện ẩn */}
              <input
                ref={fileInputRef}
                type="file"
                name="avatar"
                accept="image/png, image/jpeg, image/webp, image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {state.fieldErrors?.avatar && (
                <p className="text-destructive text-sm font-medium">{state.fieldErrors.avatar}</p>
              )}

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-foreground font-medium flex items-center gap-1.5"
                >
                  <Mail className="size-4 text-muted-foreground" />
                  Email đăng nhập
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed opacity-80"
                />
                <p className="text-muted-foreground-subtle text-xs">
                  Email đăng nhập được cố định để đảm bảo an toàn danh tính tài khoản.
                </p>
              </div>

              {/* Họ và tên */}
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

              {/* Số điện thoại */}
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
                  <p className="text-destructive text-sm font-medium">{state.fieldErrors.phone}</p>
                )}
                <p className="text-muted-foreground-subtle text-xs">
                  Số điện thoại dùng để nhận thông báo lịch khai giảng và xếp lớp học.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="submit" disabled={isPending} className="min-w-[140px]">
                  {isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
