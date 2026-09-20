'use client'

import { Camera } from 'lucide-react'
import Link from 'next/link'
import { type ChangeEvent, useRef, useState } from 'react'

import { Avatar } from '@/components/public/ui/avatar'
import { Button } from '@/components/public/ui/button'
import { LogoutCta } from '@/components/public/LogoutCta'
import { EnrollmentList } from './EnrollmentList'
import { LearningOverviewCard } from './LearningOverviewCard'
import { PersonalInfoCard } from './PersonalInfoCard'
import type { Student, Media } from '@/payload-types'
import type { StudentEnrollmentItem } from '@/services/student-enrollment'

export interface StudentAccountProps {
  user: Student
  enrollments?: StudentEnrollmentItem[]
}

export function StudentAccount({ user, enrollments = [] }: StudentAccountProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)

  const currentAvatarUrl =
    typeof user.avatar === 'object' && user.avatar !== null
      ? (user.avatar as Media).url || null
      : null

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) return
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleAvatarReset = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-hero-accent">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-6 sm:py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div
              className={`relative shrink-0 group ${isEditing ? 'cursor-pointer' : ''}`}
              onClick={() => isEditing && fileInputRef.current?.click()}
            >
              <Avatar
                className="size-16 border-2 border-primary-foreground/30 shadow-sm sm:size-24"
                name={user.fullName || user.email}
                src={avatarPreview || currentAvatarUrl}
              />
              {isEditing && (
                <div className="absolute inset-0 bg-foreground/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-primary-foreground size-5 sm:size-6" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                className="hidden"
                disabled={!isEditing}
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <h1 className="text-xl font-bold text-primary-foreground sm:text-3xl truncate">
                {user.fullName || 'Học viên'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-primary-foreground/80 break-all">
                <span className="truncate max-w-[200px] xs:max-w-none">{user.email}</span>
                {user.phone && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{user.phone}</span>
                  </>
                )}
                {user.verifiedAt && (
                  <>
                    <span aria-hidden className="hidden xs:inline">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span className="size-1.5 rounded-full bg-success" />
                      Đã xác minh email
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button asChild variant="brand" className="flex-1 sm:flex-initial">
              <Link href="/khoa-hoc">Đăng ký khóa mới</Link>
            </Button>
            <LogoutCta
              variant="outline"
              className="flex-1 sm:flex-initial border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <PersonalInfoCard
              user={user}
              avatarFile={avatarFile}
              onAvatarReset={handleAvatarReset}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
            />
            <LearningOverviewCard enrollments={enrollments} />
          </div>

          <div className="lg:col-span-8">
            <EnrollmentList enrollments={enrollments} />
          </div>
        </div>
      </div>
    </div>
  )
}
