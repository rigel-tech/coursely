import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'

import { ThemeProvider, useTheme } from '@/providers/Theme'

function ThemeConsumer() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="current-theme">{theme ?? 'undefined'}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  )
}

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
})

describe('ThemeProvider', () => {
  it('reads initial theme from data-theme attribute on documentElement', () => {
    document.documentElement.setAttribute('data-theme', 'dark')

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('current-theme').textContent).toBe('dark')
  })

  it('does not throw when window.localStorage throws SecurityError (storage blocked)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })

    document.documentElement.setAttribute('data-theme', 'light')

    expect(() => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>,
      )
    }).not.toThrow()

    expect(screen.getByTestId('current-theme').textContent).toBe('light')

    // Calling setTheme should not throw even if localStorage.setItem fails
    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /Set Dark/i }))
    }).not.toThrow()
  })

  it('updates DOM data-theme attribute when setTheme is invoked', () => {
    document.documentElement.setAttribute('data-theme', 'light')

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Set Dark/i }))

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(screen.getByTestId('current-theme').textContent).toBe('dark')
  })
})
