'use client'

import * as React from 'react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/public/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/public/ui/card'
import { RegisterForm } from './RegisterForm'

/**
 * "Đăng ký" entry point for the public site. The button toggles the registration
 * form in a `Card` anchored beneath it — no navigation, no dialog. The card is
 * absolutely positioned so opening it never reflows the header.
 */
export const RegisterCta: React.FC = () => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div className="relative" ref={containerRef}>
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
        <Card className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Tạo tài khoản mới</CardTitle>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
