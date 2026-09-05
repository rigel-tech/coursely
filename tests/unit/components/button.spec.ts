import { describe, expect, it } from 'vitest'

import { buttonVariants } from '@/components/public/ui/button'

describe('Button default variant', () => {
  it('paints an unqualified button with the brand surface, not --primary', () => {
    const classes = buttonVariants()

    expect(classes).toContain('bg-brand-accent')
    expect(classes).not.toContain('bg-primary')
  })
})
