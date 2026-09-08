'use client'

import React, { createContext, useCallback, use, useEffect, useState } from 'react'

import type { Theme, ThemeContextType } from './types'

import canUseDOM from '@/utilities/canUseDOM'
import { defaultTheme, getImplicitPreference, themeLocalStorageKey } from './shared'
import { themeIsValid } from './types'

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
}

const ThemeContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  /* `InitTheme` resolves the stored preference and writes it to <html data-theme> before
     hydration, so reading that attribute back is all React needs to seed its own state. */
  const [theme, setThemeState] = useState<Theme | undefined>(() => {
    if (!canUseDOM) return undefined

    const applied = document.documentElement.getAttribute('data-theme')

    return themeIsValid(applied) ? applied : undefined
  })

  // Safety net: if InitTheme was dropped by Next.js error boundary, ensure data-theme is set on DOM
  useEffect(() => {
    const applied = document.documentElement.getAttribute('data-theme')
    if (!themeIsValid(applied)) {
      let preference: string | null = null
      try {
        preference = window.localStorage.getItem(themeLocalStorageKey)
      } catch {
        // Storage access may throw in restricted environments
      }

      const fallback =
        theme ??
        (themeIsValid(preference) ? preference : null) ??
        getImplicitPreference() ??
        defaultTheme
      document.documentElement.setAttribute('data-theme', fallback)
    }
  }, [theme])

  const setTheme = useCallback((themeToSet: Theme | null) => {
    // `null` means "follow the OS", resolved the same way `InitTheme` resolves it.
    const resolved = themeToSet ?? getImplicitPreference() ?? defaultTheme

    try {
      if (themeToSet === null) {
        window.localStorage.removeItem(themeLocalStorageKey)
      } else {
        window.localStorage.setItem(themeLocalStorageKey, themeToSet)
      }
    } catch {
      // Storage access may throw in restricted environments (e.g. sandboxed iframes)
    }

    document.documentElement.setAttribute('data-theme', resolved)
    setThemeState(resolved)
  }, [])

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>
}

export const useTheme = (): ThemeContextType => use(ThemeContext)
