import Link from 'next/link'
import React from 'react'
import { BookOpen, Home } from 'lucide-react'

import { Button } from '@/components/public/ui/button'

export function NotFoundView() {
  return (
    <main className="container mx-auto flex min-h-[65vh] flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
      {/* 404 Visual Display */}
      <div className="mb-4 flex flex-col items-center">
        <span
          className="text-brand-accent text-3xl font-extrabold tracking-tight select-none"
          aria-hidden="true"
        >
          404
        </span>
      </div>

      {/* Heading and Description */}
      <h1 className="text-foreground text-2xl font-bold tracking-tight">Không tìm thấy trang</h1>
      <p className="text-muted-foreground mt-3 max-w-lg text-base leading-relaxed">
        Địa chỉ bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc đã được chuyển sang đường dẫn khác.
        Vui lòng kiểm tra lại URL hoặc quay về trang chủ.
      </p>

      {/* Navigation Actions */}
      <div className="mt-8 flex w-full max-w-xs flex-col items-center justify-center gap-3 sm:max-w-md sm:flex-row">
        <Button asChild variant="brand" size="lg" className="w-full sm:w-auto min-w-44">
          <Link href="/" className="inline-flex items-center justify-center gap-2">
            <Home className="size-4" />
            <span>Về trang chủ</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-w-44">
          <Link href="/khoa-hoc" className="inline-flex items-center justify-center gap-2">
            <BookOpen className="size-4" />
            <span>Khám phá khóa học</span>
          </Link>
        </Button>
      </div>
    </main>
  )
}
