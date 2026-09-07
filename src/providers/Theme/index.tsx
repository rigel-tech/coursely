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
  /* Resolve the stored preference or applied data-theme */
  const [theme, setThemeState] = useState<Theme | undefined>(() => {
    if (!canUseDOM) return undefined

    const preference = window.localStorage.getItem(themeLocalStorageKey)
    if (themeIsValid(preference)) {
      document.documentElement.setAttribute('data-theme', preference)
      return preference
    }

    const applied = document.documentElement.getAttribute('data-theme')
    if (themeIsValid(applied)) return applied

    const implicit = getImplicitPreference()
    if (implicit) {
      document.documentElement.setAttribute('data-theme', implicit)
      return implicit
    }

    return defaultTheme
  })

  // Synchronize DOM data-theme attribute with current theme state after React hydration
  useEffect(() => {
    const resolvedTheme = theme ?? getImplicitPreference() ?? defaultTheme
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [theme])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === themeLocalStorageKey) {
        const nextTheme = themeIsValid(e.newValue)
          ? e.newValue
          : (getImplicitPreference() ?? defaultTheme)
        setThemeState(nextTheme)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setTheme = useCallback((themeToSet: Theme | null) => {
    // `null` means "follow the OS", resolved the same way `InitTheme` resolves it.
    const resolved = themeToSet ?? getImplicitPreference() ?? defaultTheme

    if (themeToSet === null) {
      window.localStorage.removeItem(themeLocalStorageKey)
    } else {
      window.localStorage.setItem(themeLocalStorageKey, themeToSet)
    }

    document.documentElement.setAttribute('data-theme', resolved)
    setThemeState(resolved)
  }, [])

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>
}

export const useTheme = (): ThemeContextType => use(ThemeContext)
