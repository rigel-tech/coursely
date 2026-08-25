'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import React, { useState } from 'react'

import type { Theme } from './types'

import useIsHydrated from '@/utilities/useIsHydrated'
import { useTheme } from '..'
import { themeLocalStorageKey } from './types'

export const ThemeSelector: React.FC = () => {
  const { setTheme } = useTheme()
  const [selectedValue, setSelectedValue] = useState<string | null>(null)

  /* localStorage is browser-only, so the placeholder is shown until hydration finishes and
     the stored preference can be read without changing the markup React hydrates. */
  const isHydrated = useIsHydrated()
  const storedValue = isHydrated
    ? (window.localStorage.getItem(themeLocalStorageKey) ?? 'auto')
    : ''

  const onThemeChange = (themeToSet: Theme & 'auto') => {
    if (themeToSet === 'auto') {
      setTheme(null)
      setSelectedValue('auto')
    } else {
      setTheme(themeToSet)
      setSelectedValue(themeToSet)
    }
  }

  return (
    <Select onValueChange={onThemeChange} value={selectedValue ?? storedValue}>
      <SelectTrigger
        aria-label="Select a theme"
        className="w-auto bg-transparent gap-2 pl-0 md:pl-3 border-none"
      >
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">Auto</SelectItem>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
      </SelectContent>
    </Select>
  )
}
