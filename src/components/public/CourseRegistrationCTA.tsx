'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { CourseRegistrationForm } from '@/components/public/forms/CourseRegistrationForm'
import { Badge } from '@/components/public/ui/badge'
import { Button } from '@/components/public/ui/button'

const ENROLLMENT_STATUS_LABELS = {
  NEW: 'Mới đăng ký',
  CONFIRMED: 'Đã xác nhận',
  ATTENDED: 'Đã vào học',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
} as const

type CourseRegistrationCTAProps = {
  courseId: number
  courseSlug: string
  courseTitle: string
  enrollmentStatus?: keyof typeof ENROLLMENT_STATUS_LABELS
}

export function CourseRegistrationCTA({
  courseId,
  courseSlug,
  courseTitle,
  enrollmentStatus,
}: CourseRegistrationCTAProps) {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleRegistrationClick = async () => {
    setIsCheckingAuth(true)
    setToast(null)

    try {
      const response = await fetch('/next/auth-status')
      const data = (await response.json()) as { authenticated?: boolean }

      if (data.authenticated !== true) {
        router.push(`/dang-nhap?callbackUrl=${encodeURIComponent(`/courses/${courseSlug}`)}`)
        return
      }

      setShowForm(true)
    } catch {
      setToast('Không thể kiểm tra trạng thái đăng nhập. Vui lòng thử lại.')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  return (
    <div>
      {enrollmentStatus ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted px-3 py-3">
          <span className="text-muted-foreground text-sm">Trạng thái đăng ký</span>
          <Badge variant="success">{ENROLLMENT_STATUS_LABELS[enrollmentStatus]}</Badge>
        </div>
      ) : null}
      {toast ? (
        <p
          aria-live="polite"
          className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm"
          role="status"
        >
          {toast}
        </p>
      ) : null}
      {!enrollmentStatus && !showForm ? (
        <Button
          className="w-full py-6 text-base font-semibold"
          disabled={isCheckingAuth}
          onClick={handleRegistrationClick}
          size="lg"
        >
          {isCheckingAuth ? 'Đang kiểm tra...' : 'Đăng ký khóa học'}
        </Button>
      ) : !enrollmentStatus && showForm ? (
        <CourseRegistrationForm courseId={courseId} courseTitle={courseTitle} />
      ) : null}
    </div>
  )
}
