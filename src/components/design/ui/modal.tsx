'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/utilities/ui'

export type ModalProps = {
  /** Controlled open state. Omit both this and `onOpenChange` to let `trigger` drive it. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Element that opens the modal. Rendered as-is via Radix's `asChild`. */
  trigger?: React.ReactNode
  title: string
  /** Read out with the title by screen readers. Omit only when the body is self-explanatory. */
  description?: string
  children?: React.ReactNode
  /** Buttons, right-aligned under the body. */
  footer?: React.ReactNode
  className?: string
}

/**
 * Centred dialog with a scrim, built on Radix so focus trapping, `Esc`, scroll locking and
 * `aria-modal` come from the primitive rather than from hand-written effects.
 *
 * `title` is always rendered — Radix warns loudly without one, and an untitled dialog is
 * unusable with a screen reader. Pass `description` whenever the body is not self-evident.
 *
 * @example
 * ```tsx
 * // Uncontrolled: the trigger opens it.
 * <Modal trigger={<Button>Xoá lớp</Button>} title="Xoá lớp học?"
 *        description="Thao tác này không thể hoàn tác."
 *        footer={<Button variant="destructive">Xoá</Button>}>
 *   <p>Toàn bộ danh sách học viên của lớp sẽ bị gỡ.</p>
 * </Modal>
 *
 * // Controlled, when something other than a click opens it.
 * <Modal open={isOpen} onOpenChange={setIsOpen} title="Phiên đã hết hạn" />
 * ```
 */
export function Modal({
  children,
  className,
  description,
  footer,
  onOpenChange,
  open,
  title,
  trigger,
}: ModalProps) {
  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-foreground/40 fixed inset-0 z-50" />
        <DialogPrimitive.Content
          className={cn(
            'bg-card text-card-foreground border-border fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border p-6 shadow-lg',
            className,
          )}
        >
          <div className="flex flex-col gap-1.5 pr-6">
            <DialogPrimitive.Title className="text-heading-accent text-lg font-semibold">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-muted-foreground text-sm">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>

          {children}

          {footer ? <div className="flex justify-end gap-2">{footer}</div> : null}

          <DialogPrimitive.Close className="text-muted-foreground hover:text-foreground absolute top-5 right-5 rounded-sm transition-colors">
            <XIcon className="size-4" />
            <span className="sr-only">Đóng</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
