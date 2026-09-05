import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const { FloatingContact } = await import('@/components/public/FloatingContact')

afterEach(cleanup)

describe('FloatingContact', () => {
  it('links to Zalo with the placeholder number, opened in a new tab', () => {
    render(React.createElement(FloatingContact))

    const zalo = screen.getByRole('link', { name: /chat zalo/i })
    expect(zalo.textContent).toMatch(/0987 654 321/)
    expect(zalo.getAttribute('href')).toBe('https://zalo.me/0987654321')
    expect(zalo.getAttribute('target')).toBe('_blank')
    expect(zalo.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('links to the hotline via tel:', () => {
    render(React.createElement(FloatingContact))

    const hotline = screen.getByRole('link', { name: /gọi hotline/i })
    expect(hotline.textContent).toMatch(/1900 6789/)
    expect(hotline.getAttribute('href')).toBe('tel:19006789')
  })
})
