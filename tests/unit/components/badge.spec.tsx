// The first component test in this repo. `@testing-library/react` was already installed but
// the vitest `include` glob only matched `.spec.ts`, so nothing could reach it.
//
// The static check in `component-spec.spec.ts` reads badge.tsx as text and confirms the
// tokens the spec names appear somewhere in the file. That cannot tell whether the right
// variant carries them — every class could sit on `success` and the file would still pass.
// This renders each one and reads the class list off the element.

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Badge } from '@/components/public/ui/badge'

// RTL only auto-cleans when the runner exposes `afterEach` globally, and this project keeps
// vitest globals off — every helper is imported by name.
afterEach(cleanup)

const classesOf = (label: string): string[] => screen.getByText(label).className.split(/\s+/)

describe('Badge', () => {
  it('pairs each semantic variant with its own foreground', () => {
    render(
      <>
        <Badge variant="success">ok</Badge>
        <Badge variant="warning">careful</Badge>
        <Badge variant="error">broken</Badge>
      </>,
    )

    expect(classesOf('ok')).toEqual(
      expect.arrayContaining(['bg-success', 'text-success-foreground']),
    )
    expect(classesOf('careful')).toEqual(
      expect.arrayContaining(['bg-warning', 'text-warning-foreground']),
    )
    expect(classesOf('broken')).toEqual(
      expect.arrayContaining(['bg-error', 'text-error-foreground']),
    )
  })

  it('does not leak one variant onto another', () => {
    render(<Badge variant="success">ok</Badge>)
    const classes = classesOf('ok')

    expect(classes).not.toContain('bg-warning')
    expect(classes).not.toContain('bg-error')
  })

  it('falls back to the default variant and stays a pill', () => {
    render(<Badge>plain</Badge>)
    const classes = classesOf('plain')

    expect(classes).toContain('bg-primary')
    expect(classes).toContain('text-primary-foreground')
    // DESIGN.md gives every badge `{rounded.full}`.
    expect(classes).toContain('rounded-full')
  })

  it('keeps caller classes alongside the variant', () => {
    render(
      <Badge className="ml-2" variant="success">
        ok
      </Badge>,
    )
    const classes = classesOf('ok')

    expect(classes).toContain('ml-2')
    expect(classes).toContain('bg-success')
  })
})
