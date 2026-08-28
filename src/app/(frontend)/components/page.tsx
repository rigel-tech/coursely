import type { Metadata } from 'next'

import React from 'react'

import { ComponentGallery } from './page.client'

/**
 * Live index of every component in the project.
 *
 * A server component only so it can own the metadata: the gallery itself is a client
 * component, because the staged forms take an `onSubmit` function and a function cannot
 * cross the server/client boundary as a prop.
 */
export default function ComponentsPage() {
  return <ComponentGallery />
}

export const metadata: Metadata = {
  title: 'Thư viện component',
  description: 'Mọi component của dự án, dựng bằng design token.',
  // Internal documentation, not content. It reads as a real page to a crawler, so say
  // otherwise explicitly rather than relying on nobody linking to it.
  robots: { index: false, follow: false },
}
