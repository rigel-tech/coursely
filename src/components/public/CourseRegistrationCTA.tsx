'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  CourseRegistrationForm,
  type CourseRegistrationValues,
} from '@/components/public/forms/CourseRegistrationForm'
import { Button } from '@/components/public/ui/button'

type CourseRegistrationCTAProps = {
  courseId: number
  courseSlug: string
  courseTitle: string
}

export function CourseRegistrationCTA({
  courseId,
  courseSlug,
  courseTitle,
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
      setToast('Bạn đã đăng nhập.')
    } catch {
      setToast('Không thể kiểm tra trạng thái đăng nhập. Vui lòng thử lại.')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const handleSubmit = async (values: CourseRegistrationValues) => {
    setToast(`Đã nhận yêu cầu đăng ký khóa học ${values.courseId}.`)
  }

  return (
    <div>
      {toast ? (
        <p
          aria-live="polite"
          className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm"
          role="status"
        >
          {toast}
        </p>
      ) : null}
      {!showForm ? (
        <Button
          className="w-full py-6 text-base font-semibold"
          disabled={isCheckingAuth}
          onClick={handleRegistrationClick}
          size="lg"
        >
          {isCheckingAuth ? 'Đang kiểm tra...' : 'Đăng ký khóa học'}
        </Button>
      ) : (
        <CourseRegistrationForm
          courseId={courseId}
          courseTitle={courseTitle}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
