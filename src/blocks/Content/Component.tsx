import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/public/RichText'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

import { CMSLink } from '../../components/public/Link'

export const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { background = 'none', columns } = props

  const colsSpanClasses: Record<string, string> = {
    full: '12',
    half: '6',
    oneThird: '4',
    twoThirds: '8',
  }

  const bgClasses: Record<string, string> = {
    none: '',
    muted: 'bg-muted/40 py-12 px-6 sm:px-10 rounded-lg border border-border/50',
    card: 'bg-card py-12 px-6 sm:px-10 rounded-lg border border-border shadow-sm',
    primary: 'bg-primary text-primary-foreground py-12 px-6 sm:px-10 rounded-lg',
    dark: 'bg-secondary text-secondary-foreground py-12 px-6 sm:px-10 rounded-lg border border-border',
  }

  const columnCardClasses: Record<string, string> = {
    none: '',
    card: 'bg-card border border-border/80 rounded-lg p-6 sm:p-8 shadow-sm transition-all hover:border-primary/40',
    muted: 'bg-muted/50 border border-border/40 rounded-lg p-6 sm:p-8',
    primary: 'bg-primary/5 border border-primary/20 rounded-lg p-6 sm:p-8',
    dark: 'bg-secondary border border-border rounded-lg p-6 sm:p-8 text-secondary-foreground',
  }

  const columnTextClasses: Record<string, string> = {
    default: '',
    white: 'prose-headings:text-foreground prose-p:text-foreground text-foreground',
    primary: 'prose-headings:text-primary prose-p:text-primary text-primary',
    muted:
      'prose-headings:text-muted-foreground prose-p:text-muted-foreground text-muted-foreground',
  }

  return (
    <div className="container my-12">
      <div className={cn(bgClasses[background || 'none'])}>
        <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-8 gap-x-8 lg:gap-x-12">
          {columns &&
            columns.length > 0 &&
            columns.map((col, index) => {
              const {
                cardStyle = 'none',
                enableLink,
                link,
                richText,
                size = 'oneThird',
                textColor = 'default',
              } = col as typeof col & {
                cardStyle?: string
                textColor?: string
              }

              return (
                <div
                  className={cn(
                    `col-span-4 lg:col-span-${colsSpanClasses[size || 'oneThird']}`,
                    {
                      'md:col-span-2': size !== 'full',
                    },
                    columnCardClasses[cardStyle || 'none'],
                  )}
                  key={index}
                >
                  {richText && (
                    <RichText
                      className={cn(columnTextClasses[textColor || 'default'])}
                      data={richText}
                      enableGutter={false}
                    />
                  )}

                  {enableLink && <CMSLink {...link} className="mt-4 inline-block" />}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
