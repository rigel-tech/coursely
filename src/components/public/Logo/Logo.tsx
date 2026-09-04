import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = ({ className }: Props) => {
  return (
    <div className={clsx('flex items-center gap-2.5 select-none', className)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm tracking-tighter shadow-xs">
        SE
      </div>
      <div className="flex flex-col text-left">
        <span className="text-base font-extrabold tracking-tight text-foreground leading-none">
          SPEAKEDGE
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight mt-0.5">
          Anh ngữ công sở
        </span>
      </div>
    </div>
  )
}
