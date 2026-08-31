export const dynamic = 'force-dynamic'
export const revalidate = 0
import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google'
import React from 'react'

import { AdminBar } from '@/components/public/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

// The `vietnamese` subset is not optional here: without it every accented character falls
// out to a fallback face mid-word, which reads as a rendering glitch rather than a bug.
//
// Weights are the four the DESIGN.md typography tokens actually use. Loading a weight the
// design never asks for is dead payload; omitting one it does ask for is worse — the browser
// synthesises a smeared faux-bold instead of failing. `tests/unit/repo/fonts.spec.ts` holds
// the two files to the same list.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
})

// A variable font, so the whole 100–800 range ships in one file and no weight is declared.
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-jetbrains-mono',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

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
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
