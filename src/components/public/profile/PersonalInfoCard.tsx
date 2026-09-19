'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, Phone, ShieldCheck, User as UserIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Badge } from '@/components/public/ui/badge'
import { Button } from '@/components/public/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/public/ui/card'
import { Input } from '@/components/public/ui/input'
import { Label } from '@/components/public/ui/label'
import { updateProfileAction } from '@/actions/student/profile'
import { initialProfileState, type ProfileState } from '@/lib/constants/profile-state'
import { profileSchema, type ProfileValues } from '@/lib/validation/profile-schema'
import type { Student } from '@/payload-types'

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

interface PersonalInfoCardProps {
  user: Student
  avatarFile: File | null
  onAvatarReset: () => void
  isEditing?: boolean
  setIsEditing?: (isEditing: boolean) => void
}

export function PersonalInfoCard({
  user,
  avatarFile,
  onAvatarReset,
  isEditing: controlledIsEditing,
  setIsEditing: setControlledIsEditing,
}: PersonalInfoCardProps) {
  const [state, setState] = useState<ProfileState>(initialProfileState)
  const [uncontrolledIsEditing, setUncontrolledIsEditing] = useState(false)

  const isEditing = controlledIsEditing !== undefined ? controlledIsEditing : uncontrolledIsEditing
  const setIsEditing = setControlledIsEditing ?? setUncontrolledIsEditing

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName ?? '', phone: user.phone ?? '' },
  })

  useEffect(() => {
    reset({ fullName: user.fullName ?? '', phone: user.phone ?? '' })
  }, [user.fullName, user.phone, reset])

  const statusInfo = STATUS_LABELS[user.status || 'ACTIVE'] || {
    label: user.status || 'Hoạt động',
    variant: 'outline' as const,
  }

  const onSubmit = async (values: ProfileValues) => {
    const formData = new FormData()
    formData.set('fullName', values.fullName)
    formData.set('phone', values.phone)
    if (avatarFile) formData.set('avatar', avatarFile)

    const result = await updateProfileAction(formData).catch(() => SYSTEM_FAILURE)
    setState(result)
    if (result.status === 'success') {
      onAvatarReset()
      reset({ fullName: values.fullName, phone: values.phone })
      setIsEditing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-accent text-xl font-bold">Thông tin cá nhân</CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === 'error' && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive-foreground text-sm mb-4">
            <AlertCircle className="size-4 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}
        {state.status === 'success' && !isEditing && (
          <div className="flex items-center gap-3 rounded-lg border border-success-foreground/30 bg-success/15 p-4 text-success-foreground text-sm mb-4">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  onAvatarReset()
                  reset({ fullName: user.fullName ?? '', phone: user.phone ?? '' })
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
  )
}
