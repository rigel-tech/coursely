// Covers the two settled tests for spec 003-hero-split-layout: the Medium Impact hero is a
// two-column grid (text left, image right) only when it has BOTH rich text/links AND an
// image; with one side missing it stays a single column and the absent cell is not in the
// DOM (FR-004). Rendering order and the image itself are out of scope here — see the spec's
// quickstart for the visual checks.
//
// RichText / Media / CMSLink are stubbed: they drag in `@payloadcms/ui` (SCSS) and
// `next/image`, and this file only asserts the hero's own grid wrapper and which cells it
// renders. Same mock-then-dynamic-import pattern as header-client.spec.ts.

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

vi.mock('@/components/public/RichText', () => ({
  default: () => React.createElement('div', { 'data-testid': 'rich-text' }),
}))
vi.mock('@/components/public/Media', () => ({
  Media: () => React.createElement('img', { 'data-testid': 'media', alt: '' }),
}))
vi.mock('@/components/public/Link', () => ({
  CMSLink: () => React.createElement('a', { 'data-testid': 'cms-link' }),
}))

const { MediumImpactHero } = await import('@/heros/MediumImpact')

afterEach(cleanup)

const emptyRichText = {
  root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
} as never

const oneLink = [{ link: { type: 'custom', url: '/x', label: 'Go' } }] as never

const fakeMedia = {
  id: 1,
  url: '/i.jpg',
  mimeType: 'image/jpeg',
  alt: '',
  width: 800,
  height: 600,
  updatedAt: '2026-09-04T00:00:00.000Z',
  createdAt: '2026-09-04T00:00:00.000Z',
} as never

const rootEl = (r: ReturnType<typeof render>) => r.container.firstElementChild as HTMLElement

describe('MediumImpactHero layout', () => {
  it('uses a two-column grid when both text and media are present', () => {
    const r = render(
      <MediumImpactHero
        type="mediumImpact"
        richText={emptyRichText}
        links={oneLink}
        media={fakeMedia}
      />,
    )
    const classes = rootEl(r).className.split(/\s+/)

    expect(classes).toContain('grid')
    expect(classes).toContain('md:grid-cols-2')
    expect(classes.some((c) => c.startsWith('gap-'))).toBe(true)
  })

  it('stays single-column and drops the absent cell when one side is missing', () => {
    const textOnly = render(<MediumImpactHero type="mediumImpact" links={oneLink} />)
    expect(rootEl(textOnly).className).not.toContain('md:grid-cols-2')
    expect(textOnly.container.querySelector('[data-region="text"]')).not.toBeNull()
    expect(textOnly.container.querySelector('[data-region="media"]')).toBeNull()

    cleanup()

    const mediaOnly = render(<MediumImpactHero type="mediumImpact" media={fakeMedia} />)
    expect(rootEl(mediaOnly).className).not.toContain('md:grid-cols-2')
    expect(mediaOnly.container.querySelector('[data-region="media"]')).not.toBeNull()
    expect(mediaOnly.container.querySelector('[data-region="text"]')).toBeNull()
  })
})
