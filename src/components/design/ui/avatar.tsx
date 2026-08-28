'use client'

import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as React from 'react'

import { cn } from '@/utilities/ui'

/** Reduce a person's name to at most two initials, e.g. "Nguyễn Văn Tuấn" → "NT". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const letters = words.length === 1 ? [words[0][0]] : [words[0][0], words[words.length - 1][0]]
  return letters.join('').toLocaleUpperCase()
}

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
} as const

export type AvatarProps = {
  /** Full name. Drives the initials fallback and the default alt text. */
  name: string
  /** Image URL. When absent or failing to load, the initials show instead. */
  src?: string | null
  size?: keyof typeof SIZES
  className?: string
}

/**
 * Circular portrait with an automatic initials fallback.
 *
 * The fallback is not a loading state — Radix shows it whenever `src` is missing or the
 * image errors, so a person with no photo still renders something identifiable.
 *
 * @example
 * ```tsx
 * <Avatar name="Nguyễn Văn Tuấn" src={teacher.photoUrl} size="lg" />
 * <Avatar name="Trần Thị Mai" /> // renders "TM"
 * ```
 */
export function Avatar({ className, name, size = 'md', src }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex shrink-0 overflow-hidden rounded-full', SIZES[size], className)}
    >
      {src ? (
        <AvatarPrimitive.Image
          alt={name}
          className="aspect-square size-full object-cover"
          src={src}
        />
      ) : null}
      <AvatarPrimitive.Fallback
        className="bg-accent text-accent-foreground flex size-full items-center justify-center rounded-full font-medium"
        delayMs={src ? 300 : 0}
      >
        {initialsOf(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
