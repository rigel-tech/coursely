'use client'

import { Moon, Sun } from 'lucide-react'
import * as React from 'react'

import { useTheme } from '@/providers/Theme'
import useIsHydrated from '@/utilities/useIsHydrated'

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { setTheme, theme } = useTheme()
  const isHydrated = useIsHydrated()

  const isDark = isHydrated && theme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`size-9 rounded-full border border-border/60 bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className || ''}`}
      aria-label="Chuyển đổi giao diện sáng / tối"
      title="Chuyển đổi giao diện sáng / tối"
    >
      {isDark ? <Sun className="size-4 text-warning-foreground" /> : <Moon className="size-4" />}
    </button>
  )
}
