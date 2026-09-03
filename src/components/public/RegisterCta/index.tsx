'use client'

import * as React from 'react'
import { useState } from 'react'

import { Button } from '@/components/public/ui/button'
import { RegisterForm } from './RegisterForm'

/**
 * "Đăng ký" entry point for the public site. The button toggles the registration
 * form in a panel anchored beneath it — no navigation, no dialog. The panel is
 * absolutely positioned so opening it never reflows the header.
 */
export const RegisterCta: React.FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant={open ? 'outline' : 'default'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Đăng ký
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Tạo tài khoản mới</h2>
          <RegisterForm />
        </div>
      )}
    </div>
  )
}
