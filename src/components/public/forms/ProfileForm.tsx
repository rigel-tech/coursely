'use client'

import { Camera } from 'lucide-react'
import Link from 'next/link'
import { type ChangeEvent, useRef, useState } from 'react'

import { Avatar } from '@/components/public/ui/avatar'
import { Button } from '@/components/public/ui/button'
import { LogoutCta } from '@/components/public/LogoutCta'
import { EnrollmentList, LearningOverviewCard, PersonalInfoCard } from '@/components/public/profile'
import type { Student, Media } from '@/payload-types'
import type { StudentEnrollmentItem } from '@/services/student-enrollment'

export interface ProfileFormProps {
  user: Student
  enrollments?: StudentEnrollmentItem[]
}

export function ProfileForm({ user, enrollments = [] }: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialAvatarUrl =
    typeof user.avatar === 'object' && user.avatar !== null
      ? (user.avatar as Media).url || null
      : null

  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleAvatarReset = () => {
    setAvatarFile(null)
    setAvatarPreview(initialAvatarUrl)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header Banner */}
      <div className="bg-hero-accent">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar
                className="size-20 border-2 border-primary-foreground/30 shadow-sm sm:size-24"
                name={user.fullName || user.email}
                src={avatarPreview}
              />
              <div className="absolute inset-0 bg-foreground/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-primary-foreground size-6" />
              </div>
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

      {/* Main Content Layout */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Cột trái (4 cols) */}
          <div className="space-y-6 lg:col-span-4">
            <PersonalInfoCard
              user={user}
              avatarFile={avatarFile}
              onAvatarReset={handleAvatarReset}
            />
            <LearningOverviewCard enrollments={enrollments} />
          </div>

          {/* Cột phải (8 cols) */}
          <div className="lg:col-span-8">
            <EnrollmentList enrollments={enrollments} />
          </div>
        </div>
      </div>
    </div>
  )
}
