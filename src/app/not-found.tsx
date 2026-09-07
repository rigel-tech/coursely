import type { Metadata } from 'next'
import React from 'react'
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google'

import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { cn } from '@/utilities/ui'
import { NotFoundView } from '@/components/public/NotFoundView'
import '@/app/(frontend)/globals.css'

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: '404 - Không tìm thấy trang | Coursely',
  description: 'Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển trên Coursely.',
}

export default function RootNotFound() {
  return (
    <html
      className={cn(beVietnamPro.variable, jetBrainsMono.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <Header />
          <NotFoundView />
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
