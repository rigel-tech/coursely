'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

import { cn } from '@/utilities/ui'

export type TabItem = {
  /** Stable identifier. Also the value passed to `onValueChange`. */
  value: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

export type TabsProps = {
  items: TabItem[]
  /** Uncontrolled starting tab. Defaults to the first enabled item. */
  defaultValue?: string
  /** Pass with `onValueChange` to control the selection from outside. */
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

/**
 * Horizontal tab strip with an underlined active marker.
 *
 * Built on Radix, so arrow-key roving focus and the `tab`/`tabpanel` roles are handled;
 * only one panel is mounted at a time. Use it for alternative views of the same subject —
 * not as navigation between pages, which wants real links.
 *
 * @example
 * ```tsx
 * <Tabs
 *   items={[
 *     { value: 'overview', label: 'Tổng quan', content: <CourseOverview course={course} /> },
 *     { value: 'roadmap', label: 'Lộ trình', content: <CourseRoadmap phases={course.phases} /> },
 *     { value: 'reviews', label: 'Đánh giá', content: <Reviews />, disabled: !course.published },
 *   ]}
 * />
 * ```
 */
export function Tabs({ className, defaultValue, items, onValueChange, value }: TabsProps) {
  const fallback = items.find((item) => !item.disabled)?.value

  return (
    <TabsPrimitive.Root
      className={cn('flex flex-col gap-4', className)}
      defaultValue={defaultValue ?? fallback}
      onValueChange={onValueChange}
      value={value}
    >
      <TabsPrimitive.List className="border-border flex gap-1 border-b">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="text-muted-foreground data-[state=active]:text-heading-accent data-[state=active]:border-primary hover:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}
