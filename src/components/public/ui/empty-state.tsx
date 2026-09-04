import type { LucideIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/utilities/ui'

export type EmptyStateProps = {
  /** Lucide icon rendered above the title. Decorative — it is hidden from screen readers. */
  icon?: LucideIcon
  /** One short line saying what is missing, not an apology. */
  title: string
  /** Optional second line: why it is empty, or what to do about it. */
  description?: string
  /** The one action that fills the emptiness — usually a Button. */
  action?: React.ReactNode
  className?: string
}

/**
 * Placeholder for a list, table or search result with nothing in it.
 */
export function EmptyState({ action, className, description, icon: Icon, title }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-card flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="text-muted-foreground-subtle size-8" /> : null}
      <p className="text-foreground text-base font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-prose text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
