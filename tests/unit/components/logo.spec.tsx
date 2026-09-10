import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { Logo } from '@/components/public/Logo/Logo'
import { DEFAULT_LOGO_SHORT, DEFAULT_SITE_NAME, DEFAULT_TAGLINE } from '@/lib/constants/site'
import type { Media } from '@/payload-types'

afterEach(cleanup)

describe('Logo component (Public UI)', () => {
  it('renders image when logo has a valid url', () => {
    const mockMedia: Media = {
      id: 1,
      url: '/media/test-logo.png',
      alt: 'Test Logo',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    render(<Logo logo={mockMedia} siteName="Custom Name" tagline="Custom Tagline" />)

    const img = screen.getByRole('img', { name: 'Custom Name' })
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/media/test-logo.png')
    expect(screen.queryByText(DEFAULT_LOGO_SHORT)).toBeNull()
  })

  it('renders fallback badge SE when logo is null', () => {
    render(<Logo logo={null} />)

    expect(screen.getByText(DEFAULT_LOGO_SHORT)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders custom siteName and tagline when provided', () => {
    render(<Logo siteName="SpeakEdge Academy" tagline="Luyện thi chuyên sâu" />)

    expect(screen.getByText('SpeakEdge Academy')).toBeTruthy()
    expect(screen.getByText('Luyện thi chuyên sâu')).toBeTruthy()
  })

  it('falls back to default siteName and tagline when props are empty or null', () => {
    render(<Logo siteName={null} tagline={null} />)

    expect(screen.getByText(DEFAULT_SITE_NAME)).toBeTruthy()
    expect(screen.getByText(DEFAULT_TAGLINE)).toBeTruthy()
  })
})
