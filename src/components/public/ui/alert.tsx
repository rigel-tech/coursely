import { cn } from '@/utilities/ui'
import { type VariantProps, cva } from 'class-variance-authority'
import * as React from 'react'

const alertVariants = cva(
  'relative w-full rounded-lg border p-3.5 text-sm [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground border-border',
        destructive:
          'border-destructive-foreground/30 bg-destructive text-destructive-foreground [&>svg]:text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

/** Callout banner for status messages, validation warnings, and errors. */
const Alert: React.FC<AlertProps> = ({ className, variant, ...props }) => {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

/** Title header for `<Alert>`, rendered as a styled `div` to preserve document heading hierarchy. */
const AlertTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      data-slot="alert-title"
      className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

/** Body description container for `<Alert>`. */
const AlertDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      data-slot="alert-description"
      className={cn('text-sm opacity-90 [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
