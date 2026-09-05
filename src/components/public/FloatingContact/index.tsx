import { MessageCircle, Phone } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/public/ui/button'

// Placeholder — swap for the center's real Zalo number before this ships to real visitors.
const ZALO_PHONE = '0987 654 321'
const HOTLINE_PHONE = '1900 6789'

/**
 * Fixed, always-on contact shortcuts (Zalo chat + phone hotline) for every public
 * page. Rendered once in the `(frontend)` root layout, so it never reaches `/admin`
 * (a separate route tree) — no runtime path check needed.
 */
export const FloatingContact: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      <Button asChild variant="default" className="rounded-full">
        <a
          href={`https://zalo.me/${ZALO_PHONE.replace(/\s/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-xs font-normal">Chat Zalo</span>
            <span>{ZALO_PHONE}</span>
          </span>
        </a>
      </Button>

      <Button asChild variant="brand" className="rounded-full">
        <a href={`tel:${HOTLINE_PHONE.replace(/\s/g, '')}`}>
          <Phone />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-xs font-normal">Gọi hotline</span>
            <span>{HOTLINE_PHONE}</span>
          </span>
        </a>
      </Button>
    </div>
  )
}
