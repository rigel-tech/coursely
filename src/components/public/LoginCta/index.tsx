'use client'

import * as React from 'react'
import { useState } from 'react'

import { Button } from '@/components/public/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/public/ui/card'
import { LoginForm } from './LoginForm'

/**
 * "Đăng nhập" entry point for the public site — sibling to `RegisterCta`. The
 * button toggles the login form in a `Card` anchored beneath it; no navigation,
 * no dialog. The card is absolutely positioned so opening it never reflows the
 * header.
 */
export const LoginCta: React.FC = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant={open ? 'outline' : 'ghost'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Đăng nhập
      </Button>

      {open && (
        <Card className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Đăng nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
