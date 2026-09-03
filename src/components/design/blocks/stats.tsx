import * as React from 'react'

import { cn } from '@/utilities/ui'

export type Stat = {
  /** What is being counted, e.g. "Học viên đang học". */
  label: string
  /** Pre-formatted for display — this component never formats numbers itself, because
   *  grouping and currency are locale decisions the caller owns. */
  value: string
  /** Optional supporting line, e.g. "+12% so với tháng trước". */
  hint?: string
}

export type StatsProps = {
  items: Stat[]
  className?: string
}

/**
 * Row of headline figures, evenly divided.
 *
 * Values are rendered verbatim: format them before passing them in, so the caller decides
 * grouping, currency and locale. The figure uses the mono face, which keeps digits aligned
 * when several of these sit in a column.
 *
 * @example
 * ```tsx
 * <Stats
 *   items={[
 *     { label: 'Học viên đang học', value: '1.248', hint: '+12% so với tháng trước' },
 *     { label: 'Khoá học', value: '36' },
 *     { label: 'Tỉ lệ hoàn thành', value: '87%' },
 *   ]}
 * />
 * ```
 */
export function Stats({ className, items }: StatsProps) {
  return (
    <dl
      className={cn(
        'border-border bg-card grid grid-cols-1 gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div className="bg-card flex flex-col gap-1 p-5.5" key={item.label}>
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="text-heading-accent font-mono text-2xl font-bold">{item.value}</dd>
          {item.hint ? <p className="text-muted-foreground-subtle text-xs">{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  )
}
