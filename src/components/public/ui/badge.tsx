import { cn } from '@/utilities/ui'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

// Each semantic variant is a pair: the base token is the pale surface, the `-foreground`
// token is the readable text on it. Never `border-success` — see INVARIANTS.md.
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        brand: 'bg-brand-accent text-brand-accent-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        error: 'bg-error text-error-foreground',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

/** Small status pill. `variant` picks the semantic colour pair; see DESIGN.md `components:`. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
